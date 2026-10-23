// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Run: FOUNDRY_SRC=contracts/backers FOUNDRY_TEST=test/foundry forge test (needs forge-std, e.g. `forge install foundry-rs/forge-std --no-git`, remapped as forge-std/).

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../contracts/backers/VezoBackerStreams.sol";

contract Tok is ERC20 {
    constructor() ERC20("Tok", "TOK") {}
    function mint(address to, uint256 a) external { _mint(to, a); }
}

/// Takes 1% on every transfer, to prove deposits credit what actually arrives.
contract FeeTok is ERC20 {
    constructor() ERC20("Fee", "FEE") {}
    function mint(address to, uint256 a) external { _mint(to, a); }
    function _update(address f, address t, uint256 v) internal override {
        if (f != address(0) && t != address(0)) { uint256 fee = v / 100; super._update(f, address(0xdead), fee); v -= fee; }
        super._update(f, t, v);
    }
}

/// Rejects every transfer to one blocked address, like a token blocklist.
contract BlockTok is ERC20 {
    address immutable blocked;
    constructor(address b) ERC20("Blk", "BLK") { blocked = b; }
    function mint(address to, uint256 a) external { _mint(to, a); }
    function _update(address f, address t, uint256 v) internal override {
        require(t != blocked, "blocked");
        super._update(f, t, v);
    }
}

contract VezoBackerStreamsTest is Test {
    VezoBackerStreams s;
    Tok musd; Tok btc; FeeTok feeTok; Tok other;
    address vezo = address(0xBEEF);
    address backer = address(0xA11CE);
    address stranger = address(0xBAD);
    uint64 constant MONTH = 30 days;

    function setUp() public {
        musd = new Tok(); btc = new Tok(); feeTok = new FeeTok(); other = new Tok();
        s = new VezoBackerStreams(vezo, address(musd), address(btc), address(feeTok));
        musd.mint(backer, 1_000e18); btc.mint(backer, 10e18); feeTok.mint(backer, 1_000e18); other.mint(backer, 1e18);
        vm.startPrank(backer);
        musd.approve(address(s), type(uint256).max);
        btc.approve(address(s), type(uint256).max);
        feeTok.approve(address(s), type(uint256).max);
        other.approve(address(s), type(uint256).max);
        vm.stopPrank();
    }

    function _create(uint256 amt, uint64 dur) internal returns (uint256 id) {
        vm.prank(backer);
        id = s.create(address(musd), amt, dur, "Acme");
    }

    // ─── Creation ─────────────────────────────────────────────────────────────

    function test_create_pullsDepositAndEmits() public {
        vm.expectEmit(true, true, true, true);
        emit VezoBackerStreams.StreamCreated(1, backer, address(musd), 100e18, 4 * MONTH, "Acme");
        uint256 id = _create(100e18, 4 * MONTH);
        assertEq(id, 1);
        assertEq(musd.balanceOf(address(s)), 100e18);
        VezoBackerStreams.Stream memory st = s.getStream(id);
        assertEq(st.backer, backer);
        assertEq(uint8(st.status), uint8(VezoBackerStreams.Status.Active));
        assertEq(s.endsAt(id), block.timestamp + 4 * MONTH);
    }

    function test_create_rejects() public {
        vm.startPrank(backer);
        vm.expectRevert(VezoBackerStreams.TokenNotAccepted.selector);
        s.create(address(other), 1e18, MONTH, "");
        vm.expectRevert(VezoBackerStreams.BadDuration.selector);
        s.create(address(musd), 1e18, 1 days - 1, "");
        vm.expectRevert(VezoBackerStreams.BadDuration.selector);
        s.create(address(musd), 1e18, 730 days + 1, "");
        vm.expectRevert(VezoBackerStreams.BadAmount.selector);
        s.create(address(musd), 0, MONTH, "");
        vm.expectRevert(VezoBackerStreams.NameTooLong.selector);
        s.create(address(musd), 1e18, MONTH, "123456789012345678901234567890123");
        vm.stopPrank();
    }

    function test_create_feeOnTransfer_creditsReceived() public {
        vm.prank(backer);
        uint256 id = s.create(address(feeTok), 100e18, MONTH, "");
        assertEq(s.getStream(id).deposit, 99e18);
        vm.warp(block.timestamp + MONTH);
        s.withdraw(id); // must not revert: never owes more than it holds
    }

    function test_constructor_rejectsZero() public {
        vm.expectRevert(VezoBackerStreams.ZeroAddress.selector);
        new VezoBackerStreams(address(0), address(musd), address(btc), address(feeTok));
    }

    // ─── Streaming ────────────────────────────────────────────────────────────

    function test_streamsLinearly_andCapsAtDeposit() public {
        uint256 id = _create(120e18, 4 * MONTH);
        vm.warp(block.timestamp + MONTH);
        assertEq(s.streamedOf(id), 30e18);
        assertEq(s.refundableOf(id), 90e18);
        vm.warp(block.timestamp + 10 * MONTH);
        assertEq(s.streamedOf(id), 120e18);
        assertEq(s.refundableOf(id), 0);
    }

    function test_withdraw_anyoneCanCall_fundsOnlyGoToRecipient() public {
        uint256 id = _create(100e18, 4 * MONTH);
        vm.warp(block.timestamp + 2 * MONTH);
        vm.prank(stranger);
        uint256 got = s.withdraw(id);
        assertEq(got, 50e18);
        assertEq(musd.balanceOf(vezo), 50e18);
        assertEq(musd.balanceOf(stranger), 0);
        assertEq(s.withdraw(id), 0); // nothing new yet
    }

    function test_withdraw_unknownStream() public {
        vm.expectRevert(VezoBackerStreams.UnknownStream.selector);
        s.withdraw(99);
    }

    // ─── Pause / resume ───────────────────────────────────────────────────────

    function test_cancel_refundsEvenWhenRecipientCannotReceive() public {
        BlockTok blk = new BlockTok(vezo);
        VezoBackerStreams s2 = new VezoBackerStreams(vezo, address(blk), address(btc), address(feeTok));
        blk.mint(backer, 100e18);
        vm.startPrank(backer);
        blk.approve(address(s2), type(uint256).max);
        uint256 id = s2.create(address(blk), 100e18, 4 * MONTH, "Acme");
        vm.warp(block.timestamp + MONTH);
        s2.cancel(id); // must not revert though RECIPIENT is blocked
        vm.stopPrank();
        assertEq(blk.balanceOf(backer), 75e18);
        vm.expectRevert();
        s2.withdraw(id); // the 25 stays owed to RECIPIENT, nothing else is affected
    }

    function test_endsAt_isRealEnd_andFinished() public {
        uint256 t0 = block.timestamp;
        uint256 id = _create(100e18, MONTH);
        assertEq(s.endsAt(id), t0 + MONTH);
        assertFalse(s.isFinished(id));
        vm.warp(t0 + 3 * MONTH);
        assertEq(s.endsAt(id), t0 + MONTH); // stays put once finished
        assertTrue(s.isFinished(id));
        vm.prank(backer); s.cancel(id);
        assertFalse(s.isFinished(id));
    }

    function test_pause_stopsStreaming_andPushesEndDate() public {
        uint256 id = _create(100e18, 4 * MONTH);
        uint256 t0 = block.timestamp;
        vm.warp(t0 + MONTH);
        vm.prank(backer); s.pause(id);
        assertEq(s.streamedOf(id), 25e18);
        assertEq(s.endsAt(id), 0);
        vm.warp(t0 + 3 * MONTH); // two months paused
        assertEq(s.streamedOf(id), 25e18);
        vm.prank(backer); s.resume(id);
        assertEq(s.endsAt(id), t0 + 6 * MONTH); // 4 months + 2 paused
        vm.warp(t0 + 4 * MONTH);
        assertEq(s.streamedOf(id), 50e18);
        vm.warp(t0 + 6 * MONTH);
        assertEq(s.streamedOf(id), 100e18);
    }

    function test_onlyBackerControls() public {
        uint256 id = _create(100e18, MONTH);
        vm.startPrank(stranger);
        vm.expectRevert(VezoBackerStreams.NotBacker.selector); s.pause(id);
        vm.expectRevert(VezoBackerStreams.NotBacker.selector); s.cancel(id);
        vm.stopPrank();
        vm.prank(vezo);
        vm.expectRevert(VezoBackerStreams.NotBacker.selector); s.cancel(id);
        vm.prank(backer); s.pause(id);
        vm.prank(stranger);
        vm.expectRevert(VezoBackerStreams.NotBacker.selector); s.resume(id);
    }

    function test_statusGuards() public {
        uint256 id = _create(100e18, MONTH);
        vm.startPrank(backer);
        vm.expectRevert(VezoBackerStreams.WrongStatus.selector); s.resume(id);
        s.pause(id);
        vm.expectRevert(VezoBackerStreams.WrongStatus.selector); s.pause(id);
        s.cancel(id);
        vm.expectRevert(VezoBackerStreams.WrongStatus.selector); s.cancel(id);
        vm.expectRevert(VezoBackerStreams.WrongStatus.selector); s.resume(id);
        vm.expectRevert(VezoBackerStreams.WrongStatus.selector); s.pause(id);
        vm.stopPrank();
    }

    // ─── Cancel ───────────────────────────────────────────────────────────────

    function test_cancel_paysStreamed_refundsRest() public {
        uint256 id = _create(100e18, 4 * MONTH);
        vm.warp(block.timestamp + MONTH);
        s.withdraw(id); // 25 to vezo
        vm.warp(block.timestamp + MONTH);
        uint256 before = musd.balanceOf(backer);
        vm.prank(backer); s.cancel(id);
        assertEq(musd.balanceOf(backer) - before, 50e18);
        assertEq(musd.balanceOf(vezo), 25e18);        // cancel pays only the refund
        assertEq(s.withdrawableOf(id), 25e18);         // the rest waits for withdraw
        assertEq(s.refundableOf(id), 0);
        vm.warp(block.timestamp + 10 * MONTH);
        assertEq(s.streamedOf(id), 50e18); // frozen
        assertEq(s.withdraw(id), 25e18);
        assertEq(musd.balanceOf(vezo), 50e18);
        assertEq(musd.balanceOf(address(s)), 0);
        assertEq(s.withdraw(id), 0);
    }

    function test_cancel_rightAway_refundsEverything() public {
        uint256 id = _create(100e18, MONTH);
        uint256 before = musd.balanceOf(backer);
        vm.prank(backer); s.cancel(id);
        assertEq(musd.balanceOf(backer) - before, 100e18);
        assertEq(musd.balanceOf(vezo), 0);
    }

    function test_cancel_whilePaused() public {
        uint256 id = _create(100e18, 4 * MONTH);
        vm.warp(block.timestamp + MONTH);
        vm.prank(backer); s.pause(id);
        vm.warp(block.timestamp + 5 * MONTH);
        vm.prank(backer); s.cancel(id);
        s.withdraw(id);
        assertEq(musd.balanceOf(vezo), 25e18);
        assertEq(musd.balanceOf(address(s)), 0);
    }

    function test_streamsAreIsolated() public {
        uint256 a = _create(100e18, MONTH);
        vm.prank(backer); uint256 b = s.create(address(btc), 1e18, MONTH, "");
        vm.warp(block.timestamp + MONTH);
        vm.prank(backer); s.cancel(a);
        s.withdraw(a);
        s.withdraw(b);
        assertEq(btc.balanceOf(vezo), 1e18);
        assertEq(musd.balanceOf(vezo), 100e18);
    }

    // ─── Fuzz: money is conserved exactly ─────────────────────────────────────

    function testFuzz_conservation(uint96 amt, uint64 dur, uint32 t1, uint32 pauseFor, uint32 t2, bool doPause, bool doWithdraw) public {
        amt = uint96(bound(amt, 1, 1_000e18));
        dur = uint64(bound(dur, 1 days, 730 days));
        uint256 id = _create(amt, dur);
        uint256 bal0 = musd.balanceOf(backer);
        vm.warp(block.timestamp + bound(t1, 0, 800 days));
        if (doWithdraw) s.withdraw(id);
        if (doPause) {
            vm.prank(backer); s.pause(id);
            uint256 frozen = s.streamedOf(id);
            vm.warp(block.timestamp + bound(pauseFor, 0, 800 days));
            assertEq(s.streamedOf(id), frozen);
            vm.prank(backer); s.resume(id);
        }
        vm.warp(block.timestamp + bound(t2, 0, 800 days));
        assertLe(s.streamedOf(id), amt);
        vm.prank(backer); s.cancel(id);
        s.withdraw(id);
        uint256 refunded = musd.balanceOf(backer) - bal0;
        assertEq(musd.balanceOf(vezo) + refunded, amt, "recipient + refund == deposit");
        assertEq(musd.balanceOf(address(s)), 0, "nothing stuck");
    }

    function testFuzz_streamedIsMonotonic(uint96 amt, uint64 dur, uint32 a, uint32 b) public {
        amt = uint96(bound(amt, 1, 1_000e18));
        dur = uint64(bound(dur, 1 days, 730 days));
        uint256 id = _create(amt, dur);
        vm.warp(block.timestamp + bound(a, 0, 800 days));
        uint256 x = s.streamedOf(id);
        vm.warp(block.timestamp + bound(b, 0, 800 days));
        assertGe(s.streamedOf(id), x);
    }
}

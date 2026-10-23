// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VezoBackerStreams
/// @notice Prepaid, cancellable subscriptions for projects that back Vezo.
///
/// @dev A backer deposits the full amount for a period up front. The deposit
///      streams to RECIPIENT linearly over `duration` seconds of *active* time.
///      Only the backer controls the stream:
///        • pause  — streaming stops; the end date moves out by the paused time
///        • resume — streaming continues where it stopped
///        • cancel — whatever has not streamed yet is refunded immediately
///      Streamed funds can be pushed to RECIPIENT by anyone at any time, and
///      always land at RECIPIENT. A refund never waits on that payout: cancel
///      only refunds, and what RECIPIENT is owed stays for a later withdraw.
///      There is no owner, no admin, no upgrade path: the recipient and the
///      accepted tokens are fixed at deployment, and must be plain ERC-20s
///      with no transfer fee and no rebasing (BTC, MEZO and MUSD on Mezo).
contract VezoBackerStreams is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ────────────────────────────────────────────────────────────────

    enum Status { None, Active, Paused, Canceled }

    struct Stream {
        address backer;
        address token;
        uint128 deposit;      // amount actually received at creation
        uint128 withdrawn;    // already sent to RECIPIENT
        uint64  duration;     // seconds of active time to stream the deposit
        uint64  accrued;      // active seconds banked before the current run
        uint64  runStart;     // when the current active run began (Active only)
        Status  status;
    }

    // ─── Constants / immutables ───────────────────────────────────────────────

    uint64 public constant MIN_DURATION = 1 days;
    uint64 public constant MAX_DURATION = 730 days;
    uint256 public constant MAX_NAME_BYTES = 32;

    address public immutable RECIPIENT;
    address public immutable TOKEN_A;
    address public immutable TOKEN_B;
    address public immutable TOKEN_C;

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 public nextStreamId = 1;
    mapping(uint256 => Stream) private _streams;

    // ─── Events ───────────────────────────────────────────────────────────────

    event StreamCreated(
        uint256 indexed id,
        address indexed backer,
        address indexed token,
        uint256 deposit,
        uint64 duration,
        string name
    );
    event StreamPaused(uint256 indexed id, uint256 streamedSoFar);
    event StreamResumed(uint256 indexed id);
    event StreamCanceled(uint256 indexed id, uint256 streamedTotal, uint256 refunded);
    event Withdrawn(uint256 indexed id, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();
    error TokenNotAccepted();
    error BadAmount();
    error BadDuration();
    error NameTooLong();
    error NotBacker();
    error WrongStatus();
    error UnknownStream();

    constructor(address recipient, address tokenA, address tokenB, address tokenC) {
        if (recipient == address(0) || tokenA == address(0) || tokenB == address(0) || tokenC == address(0)) {
            revert ZeroAddress();
        }
        RECIPIENT = recipient;
        TOKEN_A = tokenA;
        TOKEN_B = tokenB;
        TOKEN_C = tokenC;
    }

    // ─── Backer actions ───────────────────────────────────────────────────────

    /// @notice Deposit `amount` of `token`, streamed to RECIPIENT over `duration`.
    /// @param name Optional project name shown on the backers board (≤ 32 bytes).
    function create(address token, uint256 amount, uint64 duration, string calldata name)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (!isAccepted(token)) revert TokenNotAccepted();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert BadDuration();
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();
        if (amount == 0) revert BadAmount();

        // Credit what actually arrived, not what was asked for.
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        if (received == 0 || received > type(uint128).max) revert BadAmount();

        id = nextStreamId++;
        _streams[id] = Stream({
            backer: msg.sender,
            token: token,
            deposit: uint128(received),
            withdrawn: 0,
            duration: duration,
            accrued: 0,
            runStart: uint64(block.timestamp),
            status: Status.Active
        });
        emit StreamCreated(id, msg.sender, token, received, duration, name);
    }

    /// @notice Stop streaming. Already-streamed funds stay withdrawable.
    function pause(uint256 id) external nonReentrant {
        Stream storage s = _onlyBacker(id);
        if (s.status != Status.Active) revert WrongStatus();
        s.accrued = _activeSeconds(s);
        s.status = Status.Paused;
        emit StreamPaused(id, _streamed(s));
    }

    /// @notice Continue a paused stream.
    function resume(uint256 id) external nonReentrant {
        Stream storage s = _onlyBacker(id);
        if (s.status != Status.Paused) revert WrongStatus();
        s.runStart = uint64(block.timestamp);
        s.status = Status.Active;
        emit StreamResumed(id);
    }

    /// @notice End the stream and refund everything that has not streamed.
    /// @dev What has streamed stays in the stream for `withdraw`, so the refund
    ///      never depends on a transfer to RECIPIENT going through.
    function cancel(uint256 id) external nonReentrant {
        Stream storage s = _onlyBacker(id);
        if (s.status != Status.Active && s.status != Status.Paused) revert WrongStatus();

        uint256 streamed = _streamed(s);
        uint256 refund = uint256(s.deposit) - streamed;

        // Freeze the stream at what has streamed; nothing more accrues.
        s.deposit = uint128(streamed);
        s.status = Status.Canceled;

        emit StreamCanceled(id, streamed, refund);
        if (refund > 0) IERC20(s.token).safeTransfer(s.backer, refund);
    }

    // ─── Anyone ───────────────────────────────────────────────────────────────

    /// @notice Push everything streamed so far to RECIPIENT.
    function withdraw(uint256 id) external nonReentrant returns (uint256 amount) {
        Stream storage s = _streams[id];
        if (s.status == Status.None) revert UnknownStream();
        amount = _streamed(s) - s.withdrawn;
        if (amount == 0) return 0;
        s.withdrawn += uint128(amount);
        emit Withdrawn(id, amount);
        IERC20(s.token).safeTransfer(RECIPIENT, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function isAccepted(address token) public view returns (bool) {
        return token == TOKEN_A || token == TOKEN_B || token == TOKEN_C;
    }

    function getStream(uint256 id) external view returns (Stream memory) {
        return _streams[id];
    }

    /// @notice Total streamed to date (withdrawn or not).
    function streamedOf(uint256 id) external view returns (uint256) {
        return _streamed(_streams[id]);
    }

    /// @notice Streamed but not yet sent to RECIPIENT.
    function withdrawableOf(uint256 id) external view returns (uint256) {
        Stream storage s = _streams[id];
        return _streamed(s) - s.withdrawn;
    }

    /// @notice What the backer would get back if they canceled now.
    function refundableOf(uint256 id) external view returns (uint256) {
        Stream storage s = _streams[id];
        if (s.status != Status.Active && s.status != Status.Paused) return 0;
        return uint256(s.deposit) - _streamed(s);
    }

    /// @notice When the stream ends (or ended) if nothing changes; 0 when
    ///         paused or canceled. A finished stream returns its real end time,
    ///         which is in the past, so readers can tell it has finished.
    function endsAt(uint256 id) external view returns (uint256) {
        Stream storage s = _streams[id];
        if (s.status != Status.Active) return 0;
        return uint256(s.runStart) + s.duration - s.accrued;
    }

    /// @notice True once the whole deposit has streamed.
    function isFinished(uint256 id) external view returns (bool) {
        Stream storage s = _streams[id];
        if (s.status == Status.None || s.status == Status.Canceled) return false;
        return _activeSeconds(s) == s.duration;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _onlyBacker(uint256 id) private view returns (Stream storage s) {
        s = _streams[id];
        if (s.status == Status.None) revert UnknownStream();
        if (msg.sender != s.backer) revert NotBacker();
    }

    function _activeSeconds(Stream storage s) private view returns (uint64) {
        uint256 t = s.accrued;
        if (s.status == Status.Active) t += block.timestamp - s.runStart;
        return t > s.duration ? s.duration : uint64(t);
    }

    function _streamed(Stream storage s) private view returns (uint256) {
        if (s.status == Status.None) return 0;
        if (s.status == Status.Canceled) return s.deposit; // frozen at cancel
        return (uint256(s.deposit) * _activeSeconds(s)) / s.duration;
    }
}

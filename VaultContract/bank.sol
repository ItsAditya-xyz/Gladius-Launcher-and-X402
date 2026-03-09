// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address a) external view returns (uint256);
}

contract Vault {
  address public immutable banker;

  constructor(address _banker) {
    banker = _banker;
  }

  modifier onlyBanker() {
    require(msg.sender == banker, "ONLY_BANKER");
    _;
  }

  // Receive native AVAX
  receive() external payable {}

  function transferNative(address payable to, uint256 amount) external onlyBanker {
    require(address(this).balance >= amount, "INSUFFICIENT_NATIVE");
    (bool ok, ) = to.call{value: amount}("");
    require(ok, "NATIVE_TRANSFER_FAILED");
  }

  function transferERC20(address token, address to, uint256 amount) external onlyBanker {
    require(IERC20(token).transfer(to, amount), "ERC20_TRANSFER_FAILED");
  }

  function sweepAllNative(address payable to) external onlyBanker {
    (bool ok, ) = to.call{value: address(this).balance}("");
    require(ok, "SWEEP_FAILED");
  }

  function sweepAllERC20(address token, address to) external onlyBanker {
    uint256 bal = IERC20(token).balanceOf(address(this));
    require(IERC20(token).transfer(to, bal), "ERC20_SWEEP_FAILED");
  }
}

contract Banker {
  address public owner;
  address public treasury;
  uint16 public constant BPS_DENOM = 10_000;
  mapping(address => bool) public isAdmin;
  mapping(address => bool) public isVault;
  mapping(address => uint16) public vaultFeeBps;

  event VaultCreated(address vault, bytes32 salt);
  event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
  event AdminUpdated(address indexed admin, bool enabled);
  event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
  event VaultFeeUpdated(address indexed vault, uint16 feeBps);

  modifier onlyAdmin() {
    require(msg.sender == owner || isAdmin[msg.sender], "ONLY_ADMIN");
    _;
  }

  constructor() {
    owner = msg.sender;
    isAdmin[msg.sender] = true;
    treasury = msg.sender;
  }

  function setOwner(address newOwner) external onlyAdmin {
    require(newOwner != address(0), "BAD_OWNER");
    emit OwnerUpdated(owner, newOwner);
    owner = newOwner;
    isAdmin[newOwner] = true;
  }

  // Create a unique address (Vault contract) using CREATE2
  function createAddress(bytes32 salt) external onlyAdmin returns (address vaultAddr) {
    return _createAddress(salt, 0);
  }

  function createAddressWithFee(bytes32 salt, uint16 feeBps) external onlyAdmin returns (address vaultAddr) {
    return _createAddress(salt, feeBps);
  }

  function _createAddress(bytes32 salt, uint16 feeBps) internal returns (address vaultAddr) {
    require(feeBps <= BPS_DENOM, "BAD_FEE_BPS");
    Vault vault = new Vault{salt: salt}(address(this));
    vaultAddr = address(vault);
    isVault[vaultAddr] = true;
    vaultFeeBps[vaultAddr] = feeBps;
    emit VaultCreated(vaultAddr, salt);
    emit VaultFeeUpdated(vaultAddr, feeBps);
  }

  function setTreasury(address newTreasury) external onlyAdmin {
    require(newTreasury != address(0), "BAD_TREASURY");
    emit TreasuryUpdated(treasury, newTreasury);
    treasury = newTreasury;
  }

  function setVaultFeeBps(address vault, uint16 feeBps) external onlyAdmin {
    require(isVault[vault], "NOT_A_VAULT");
    require(feeBps <= BPS_DENOM, "BAD_FEE_BPS");
    vaultFeeBps[vault] = feeBps;
    emit VaultFeeUpdated(vault, feeBps);
  }

  function setAdmin(address admin, bool enabled) external onlyAdmin {
    require(admin != address(0), "BAD_ADMIN");
    isAdmin[admin] = enabled;
    emit AdminUpdated(admin, enabled);
  }

  // Move native AVAX out of a vault you created
  function transfer(address vault, address payable to, uint256 amount) external onlyAdmin {
    transferFromBank(vault, to, address(0), amount);
  }

  // ERC20 transfer out of a vault you created
  function transferToken(address vault, address token, address to, uint256 amount) external onlyAdmin {
    transferFromBank(vault, payable(to), token, amount);
  }

  // Main function requested: move funds from a receiving address to any wallet.
  // If token == address(0), moves native AVAX; otherwise moves ERC20.
  function transferFromBank(address vault, address payable to, address token, uint256 amount) public onlyAdmin {
    require(isVault[vault], "NOT_A_VAULT");
    uint16 feeBps = vaultFeeBps[vault];
    if (feeBps > 0) {
      require(treasury != address(0), "NO_TREASURY");
    }
    uint256 fee = (amount * feeBps) / BPS_DENOM;
    uint256 remainder = amount - fee;
    if (token == address(0)) {
      if (fee > 0) {
        Vault(payable(vault)).transferNative(payable(treasury), fee);
      }
      if (remainder > 0) {
        Vault(payable(vault)).transferNative(to, remainder);
      }
    } else {
      if (fee > 0) {
        Vault(payable(vault)).transferERC20(token, treasury, fee);
      }
      if (remainder > 0) {
        Vault(payable(vault)).transferERC20(token, to, remainder);
      }
    }
  }

  // Optional: compute what address a salt will produce (before deploying)
  function predictAddress(bytes32 salt) external view returns (address predicted) {
    bytes memory bytecode = abi.encodePacked(
      type(Vault).creationCode,
      abi.encode(address(this))
    );
    bytes32 hash = keccak256(
      abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode))
    );
    predicted = address(uint160(uint256(hash)));
  }
}

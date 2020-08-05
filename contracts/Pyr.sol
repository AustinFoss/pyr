// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

import "./ERC721.sol";

contract Content is ERC721 {
    // Content MetaData that is not part of the ERC721 MetaData standard

    string title;
    uint256 price;
    string encryptedBucket;
    address payable owner;

    constructor(string memory _title, uint256 _price, string memory _encryptedBucket, address payable _owner) ERC721(_title, "PYR") public {
        title = _title;
        price = _price;
        encryptedBucket = _encryptedBucket;
        owner = _owner;
    }
    // Returns up to date ContentData
    function getContentData() public view returns(
        string memory,
        uint256,
        string memory,
        address
    ){
        return (
            title,
            price,
            encryptedBucket,
            owner
        );
    }

    function purchase() public payable returns(uint256) {
        require(msg.value >= price,"Payment value is less than the content price. Please pay the minimum price.");
        uint256 supply = this.totalSupply();
        _safeMint(msg.sender, supply);
        owner.transfer(msg.value);
        return (supply);
    }
}

contract Pyr {

    // All published content through Pyr has the NFT Contract address mapped to the creator's address
    mapping(address => address[]) creatorLibrary;
    // Logs the contentId(NFT Contract Address) and its creator's address
    event ContentPublished(address indexed creator, address contentId);
    // Publish new content
    function newContent(string memory _title, uint256 _price, string memory _encryptedBucket) public {
        address contentId = address(new Content(_title, _price, _encryptedBucket, msg.sender));
        creatorLibrary[msg.sender].push(contentId);
        emit ContentPublished (msg.sender, contentId);
    }
    // Returns all Content in a Creator's Library
    function getCreatorLibrary(address creator) public view returns(address[] memory) {
        return(creatorLibrary[creator]);
    }
}
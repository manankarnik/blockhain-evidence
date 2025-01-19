// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
contract Evidence {

    struct EvidenceRecord {
        string  caseId;
        uint    timestamp;
        address uploader;
        string  cid;
        string  fileName;
        string  description;
    }

    EvidenceRecord[] public evidenceRecords;
    mapping(string => bool) public evidenceCids;

    function addEvidence(string memory caseId, string memory cid, string memory fileName, string memory description) public {
        require(!evidenceCids[cid], "Evidence already added");
        evidenceRecords.push(EvidenceRecord({
            caseId:      caseId,
            timestamp:   block.timestamp,
            uploader:    msg.sender,
            cid:         cid,
            fileName:    fileName,
            description: description
        }));
        evidenceCids[cid] = true;
    }

    function verifyEvidence(string memory cid) public view returns (bool) {
        return evidenceCids[cid];
    }

    function getEvidence(string memory cid) public view returns (EvidenceRecord memory) {
        require(evidenceCids[cid], "Evidence not found");
        for (uint i = 0; i < evidenceRecords.length; i++) {
            if (keccak256(abi.encodePacked(evidenceRecords[i].cid)) == keccak256(abi.encodePacked(cid))) {
                return evidenceRecords[i];
            }
        }
    }

    function getEvidenceList() public view returns (EvidenceRecord[] memory) {
        return evidenceRecords;
    }
}

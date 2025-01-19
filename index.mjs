import EvidenceContract from "./build/contracts/Evidence.json" with { type: "json" };
import fileUpload from "express-fileupload";
import { unixfs } from "@helia/unixfs";
import bodyParser from "body-parser";
import { createHelia } from "helia";
import express from "express";
import Web3 from "web3";
import path from "path";
import fs from "fs";

const __dirname = import.meta.dirname;
const contract_address = "0xb31F54af92EC52a43dC6dbA9928E4A081301fC3E";
const helia = await createHelia();
const ufs = unixfs(helia)
const web3 = new Web3("http://127.0.0.1:7545");
const accounts = await web3.eth.getAccounts();
const evidenceContract = new web3.eth.Contract(EvidenceContract.abi, contract_address);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/upload", (req, res) => {
    res.sendFile(path.join(__dirname, "upload.html"));
});

app.get("/verify", (req, res) => {
    res.sendFile(path.join(__dirname, "verify.html"));
});
app.get("/list", async (req, res) => {
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Blockchain Evidence</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100">
      <header class="fixed top-0 w-full bg-white p-4 shadow-md">
        <nav class="flex justify-center font-semibold text-gray-500 gap-6">
            <a
              href="/"
              class="hover:text-gray-800 transition duration-200"
            >
              Home
            </a>
            <a
              href="/download"
              class="hover:text-gray-800 transition duration-200"
            >
              Download Evidence
            </a>
            <a
              href="/upload"
              class="hover:text-gray-800 transition duration-200"
            >
              Upload Evidence
            </a>
            <a
              href="/verify"
              class="hover:text-gray-800 transition duration-200"
            >
              Verify Evidence
            </a>
            <a
              href="/list"
              class="text-blue-600"
            >
              List Evidences
            </a>
        </nav>
      </header>`;
    let evidences;
    try {
        evidences = await await evidenceContract.methods.getEvidenceList().call();
    } catch {
        htmlContent += `</body></html>`;
        return res.send(htmlContent);
    }
    htmlContent += `
        <div class="container mx-auto p-6 pt-12 mt-12">
          <h1 class="text-3xl font-bold text-center text-blue-600 mb-8">List Evidences</h1>
          <div class="flex justify-center">  
            <div class="w-fit-content space-y-6">`;
    for (let [index, evidence] of evidences.entries()) {
        htmlContent += `
          <div class="bg-white p-6 rounded-lg shadow-lg w-fit-content">
            <h2 class="text-xl font-semibold text-blue-600">Evidence #${index+1}</h2>
            <div class="flex gap-4 mt-4">
              <div class="font-semibold text-blue-500">
                <div>Case ID</div>
                <div>File Name</div>
                <div>Description</div>
                <div>Timestamp</div>
                <div>Uploader Address</div>
                <div>CID</div>
              </div>
              <div>
                <div>${evidence.caseId}</div>
                <div>${evidence.fileName}</div>
                <div>${evidence.description}</div>
                <div>${new Date(Number(evidence.timestamp.toString()) * 1000).toLocaleString()}</div>
                <div>${evidence.uploader}</div>
                <div>${evidence.cid}</div>
              </div>
            </div>
          </div>`;
    }
    htmlContent += `</div></div></div></body></html>`;
    res.send(htmlContent);
});

app.get("/download", (req, res) => {
    res.sendFile(path.join(__dirname, "download.html"));
});

app.post("/upload", async (req, res) => {
    if (!req.files || Object.keys(req.files).length == 0) return res.send(`<script>alert("Error: No file uploaded");window.history.go(-1);</script>`);
    const {address, caseId, description} = req.body;
    if (!accounts.includes(address)) return res.send(`<script>alert("Error: Invalid address");window.history.go(-1);</script>`);
    const {name, data} = req.files.evidence;
    const cid = await ufs.addBytes(data);
    try {
        const result = await evidenceContract.methods.addEvidence(caseId, cid.toString(), name, description).call();
    } catch(err) {
        return res.send(`<script>alert("${err.cause.errorArgs.message}");window.history.go(-1);</script>`);
    }
    const gasEstimate = await evidenceContract.methods.addEvidence(caseId, cid.toString(), name, description).estimateGas({ from: address });
    const result = await evidenceContract.methods.addEvidence(caseId, cid.toString(), name, description).send({ from: address, gas: gasEstimate });
    res.send(`<script>alert("Evidence Uploaded successfully!\nCID: ${cid.toString()}");window.history.go(-1);</script>`);
});

app.post("/verify", async (req, res) => {
    if (!req.files || Object.keys(req.files).length == 0) res.send("No file uploaded");
    const cid = await ufs.addBytes(req.files.evidence.data);
    const result = await evidenceContract.methods.verifyEvidence(cid.toString()).call();
    if (result) {
        const evidence = await evidenceContract.methods.getEvidence(cid.toString()).call();
        let htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Blockchain Evidence</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-gray-100">
            <header class="fixed top-0 w-full bg-white p-4 shadow-md">
              <nav class="flex justify-center font-semibold text-gray-500 gap-6">
                <a
                  href="/"
                  class="hover:text-gray-800 transition duration-200"
                >
                  Home
                </a>
                <a
                  href="/download"
                  class="hover:text-gray-800 transition duration-200"
                >
                  Download Evidence
                </a>
                <a
                  href="/upload"
                  class="hover:text-gray-800 transition duration-200"
                >
                  Upload Evidence
                </a>
                <a
                  href="/verify"
                  class="hover:text-gray-800 transition duration-200"
                >
                  Verify Evidence
                </a>
                <a
                  href="/list"
                  class="hover:text-gray-800 transition duration-200"
                >
                  List Evidences
                </a>
              </nav>
            </header>
            <div class="container mx-auto p-6 pt-12 mt-12">
              <h1 class="text-3xl font-bold text-center text-blue-600 mb-8">Evidence Verified</h1>
              <div class="flex justify-center">
                <div class="bg-white p-6 rounded-lg shadow-lg w-fit-content">
                  <h2 class="text-xl font-semibold text-blue-600">Evidence</h2>
                  <div class="flex gap-4 mt-4">
                    <div class="font-semibold text-blue-500">
                      <div>Case ID</div>
                      <div>File Name</div>
                      <div>Description</div>
                      <div>Timestamp</div>
                      <div>Uploader Address</div>
                      <div>CID</div>
                    </div>
                    <div>
                      <div>${evidence.caseId}</div>
                      <div>${evidence.fileName}</div>
                      <div>${evidence.description}</div>
                      <div>${new Date(Number(evidence.timestamp.toString()) * 1000).toLocaleString()}</div>
                      <div>${evidence.uploader}</div>
                      <div>${evidence.cid}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>`;
        res.send(htmlContent);
    } else res.send("<script>alert('Evidence could not be verified');window.history.go(-1);</script>");
});

app.post("/download", async (req, res) => {
    let fileBytes = []
    let evidence;
    try {
        evidence = await evidenceContract.methods.getEvidence(req.body.cid).call();
    } catch (err) {
        return res.send(`<script>alert("${err.cause.errorArgs.message}");window.history.go(-1);</script>`);
    }
    try {
        for await (const chunk of ufs.cat(req.body.cid, { signal: AbortSignal.timeout(3000) })) {
            fileBytes.push(chunk);
        }
    } catch {
        return res.send(`<script>alert("Error: Evidence not found");window.history.go(-1);</script>`);
    }
    const file = new Uint8Array(fileBytes.reduce((acc, chunk) => acc + chunk.length, 0));
    if (file.length == 0) return res.send(`<script>alert("Error: Evidence file empty");window.history.go(-1);</script>`);
    let offset = 0;
    fileBytes.forEach(chunk => {
        file.set(chunk, offset);
        offset += chunk.length;
    });
    const fileBuffer = Buffer.from(file);
    res.setHeader("Content-Disposition", `attachment; filename="${evidence.fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(fileBuffer);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

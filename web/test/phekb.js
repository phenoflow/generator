const Importer = require("./importer");
const chai = require("chai");
chai.use(require("chai-http"));
const fs = require("fs").promises;
const config = require("config");
const models = require('../models');
const importerUtils = require("../util/importer");

async function importPhekbCodelists(path, files) {
  
  let csvs=[];
  for(let file of files) csvs.push({"filename":file, "content":await importerUtils.openCSV(path, file)});
  let id = await importerUtils.hashFiles(path, files);
  return await Importer.importCodelists(csvs, importerUtils.getName(files[0]), id+" - "+importerUtils.getName(files[0]), "phekb");

}

async function importPhekbSteplist(path, file) {
  
  let stepList = {"filename":file, "content":await importerUtils.openCSV(path, file)};
  let csvs = [];
  for(let row of stepList.content) {
    if(row["logicType"]=="codelist") {
      let file = row["param"].split(":")[0];
      csvs.push({"filename":file, "content": await importerUtils.openCSV(path, file)});
    }
  }
  let id = await importerUtils.hashFiles(path, csvs.map((csv)=>csv.filename));
  return await Importer.importSteplist(stepList, csvs, importerUtils.getName(stepList.filename), id+" - "+importerUtils.getName(stepList.filename), "phekb");

}

async function testPhekbCodelist(file) {

  const PATH = "test/"+config.get("importer.CODELIST_FOLDER")+"/_data/codelists/";
  // Can't perform test if file doesn't exist.
  try { await fs.stat(PATH) } catch(error) { return true; }
  let res = await importPhekbCodelists(PATH, [file]);
  res.body.should.be.a("object");
  res.should.have.status(200);

}

async function testPhekbSteplist(list) {

  const PATH = "test/"+config.get("importer.CODELIST_FOLDER")+"/_data/codelists/";
  try { await fs.stat(PATH) } catch(error) { return true; }
  let res = await importPhekbSteplist(PATH, list);
  res.body.should.be.a("object");
  res.should.have.status(200);

}

describe("phekb importer", () => {

  describe("/POST import phekb csv", () => {

		it("[PI1] Should be able to add a new user.", async() => {
			const result = await models.user.create({name:"phekb", password:config.get("user.DEFAULT_PASSWORD"), verified:"true", homepage:"https://phekb.org"});
			result.should.be.a("object");
		});

    it("[PI2] Should be able to import a codelist.", async() => { 
      await testPhekbCodelist("rheumatoid-arthritis-3_icd.csv");
    }).timeout(0);

    it("[PI3] Should be able to import all codelists.", async() => { 
      const PATH = "test/"+config.get("importer.CODELIST_FOLDER")+"/_data/codelists/";
      // Can't perform test if file doesn't exist.
      try { await fs.stat(PATH) } catch(error) { return true; }
      let phenotypeFiles = await fs.readdir(PATH);
      for(let phenotypeFile of phenotypeFiles) {
        console.log(phenotypeFile);
        if(phenotypeFile.includes("_rx") || phenotypeFile.includes("_lab") || phenotypeFile.includes("_key")) continue;
        let res = await importPhekbCodelists(PATH, [phenotypeFile]);
        res.body.should.be.a("object");
        res.should.have.status(200);
      }
    }).timeout(0);

    it("[PI4] Should be able to merge codelists.", async() => { 
      const PATH = "test/"+config.get("importer.CODELIST_FOLDER")+"/_data/codelists/";
      const FILE_A = "abdominal-aortic-aneurysm-2_cpt.csv";
      const FILE_B = "abdominal-aortic-aneurysm-2_icd.csv";
      // Can't perform test if file doesn't exist.
      try { await fs.stat(PATH) } catch(error) { return true; }
      let res = await importPhekbCodelists(PATH, [FILE_A, FILE_B]);
      res.body.should.be.a("object");
      res.should.have.status(200);
    }).timeout(0);

    it("[PI5] Should be able to construct a phenotype from a list of steps.", async() => { 
      await testPhekbSteplist("abdominal-aortic-aneurysm-2.csv");
    }).timeout(0);

  });

});

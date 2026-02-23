require("dotenv").config({ path: "../.env" });
const mongoose=require("mongoose");
const Listing = require("../models/listing.js");
const initData=require("./data.js");

const dbUrl=process.env.ATLASDB_URL;

main()
.then(()=>{
    console.log("connected to DB");
})
.catch((err)=>{
    console.log(err);
})

async function main(){
    await mongoose.connect(dbUrl);
}


const initDB=async()=>{
    await Listing.deleteMany({});
   initData.data= initData.data.map((obj)=>({...obj,owner:"699b52bb0ed83a1e9415d779"}));
    await Listing.insertMany(initData.data);
    console.log("data is initialized");
}

initDB();

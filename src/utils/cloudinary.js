import { v2 as cloudinary } from "cloudinary";
import fs from "fs" //file system of node js
// const fs = require('fs');


const uploadOnCloudinary = async (localFilePath)=>{
    console.log('cloud name:',process.env.CLOUDINARY_CLOUD_NAME);
    
    try{
        cloudinary.config({ 
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
            api_key: process.env.CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET 
          });
        
        if(!localFilePath) return null;
        console.log(localFilePath);

        //upload file on cloudinary
        const resp = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
        }, 
        function(error, result) { console.log(error);console.log(result); })
        //file has been uploaded successfully
        console.log("File uploaded on cloudnary",resp.url)
        fs.unlinkSync(localFilePath); //if you do not unlink, you can find files in public/temp folder
        return resp;
    }
    catch(error){
        console.log(error);
        fs.unlink(localFilePath) //remove locally saved temp file as the upload operation got failed

    }
}

export {uploadOnCloudinary};
//   cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });
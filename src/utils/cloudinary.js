import { v2 as cloudinary } from "cloudinary";
import fs from "fs" //file system of node js

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });


const uploadOnCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath) return null;

        //upload file on cloudinary
        const resp = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",

        })
        //file has been uploaded successfully
        console.log("File uploaded on cloudnary",response.url)

        return response;
    }
    catch(error){
        fs.unlink(localFilePath) //remove locally saved temp file as the upload operation got failed

    }
}

export {uploadOnCloudinary};
//   cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import dotenv from "dotenv"
dotenv.config({path: './.env'})


cloudinary.config({ 
    cloud_name: process.env.CLOUDNARY_CLOUD_NAME, 
    api_key: process.env.CLOUDNARY_API_KEY, 
    api_secret: process.env.CLOUDNARY_API_SECRET 
  });


const uploadOnCloudinary = async  (localFilePath) => {
    try {
        //console.log("localFilePath: ", localFilePath);
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
     fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got success
        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error);
        fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export { uploadOnCloudinary }
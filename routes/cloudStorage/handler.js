const fs = require("fs");
const path = require("path");
const { upload_url } = require("../../config/config");

exports.uploadImageHandler = async function (req, res) {
  try {
    // Ensure `req.file` exists and is correctly populated
    const myFile = req.file ? req.file : JSON.parse(req.body.file);

    if (!myFile) {
      return res.status(400).json({
        message: "No file provided",
      });
    }

    // Define the upload directory outside the `api` folder
    const uploadDir = path.join(__dirname, "../../../", "uploads");

    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create a timestamped file name
    const timestamp = Date.now();
    const originalExtension = path.extname(myFile.originalname);
    const baseName = path.basename(myFile.originalname, originalExtension);
    const newFileName = `${baseName}_${timestamp}${originalExtension}`;

    // Define the file's destination path
    const filePath = path.join(uploadDir, newFileName);

    // Save the file to the upload directory
    fs.writeFileSync(filePath, myFile.buffer);

    // Construct the image URL
    const baseUrl = `${upload_url}`;
    const imageUrl = `${baseUrl}${newFileName}`;

    res.status(200).json({
      message: "Upload was successful",
      data: imageUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
};

// const uploadImage = require("./helper");

// exports.uploadImageHandler = async function (req, res) {
//   try {
//     const myFile = req.file ? req.file : JSON.parse(req.body.file);

//     const imageUrl = await uploadImage.uploadS3Image(myFile);
//     res.status(200).json({
//       message: "Upload was successful",
//       data: imageUrl,
//     });
//   } catch (error) {
//     console.log(error);
//     var jsonResp = {};
//     jsonResp.Success = false;
//     jsonResp.Data = error;
//     res.status(400).send(jsonResp);
//   }
// };
// exports.uploadImageOffer = async function (req, res) {
//   console.log(req.file);
//   try {
//     const myFile = req.file;
//     const imageUrl = await uploadImage(myFile);
//     var jsonResp = {
//       status: true,
//       originalName: "demoImage.jpg",
//       width: "1600px",
//       height: "200px",
//       generatedName: "demoImage.jpg",
//       msg: "Image upload successful",
//       imageUrl: imageUrl,
//     };

//     res.status(200).json(jsonResp);
//   } catch (error) {
//     var jsonResp = {};
//     jsonResp.Success = false;
//     jsonResp.Data = error;
//     res.status(400).send(jsonResp);
//   }
// };

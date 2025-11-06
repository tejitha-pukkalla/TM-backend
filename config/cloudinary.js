const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for project documents
const projectStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'task-manager/projects',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
    resource_type: 'auto'
  }
});

// Storage for task attachments
const taskStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'task-manager/tasks',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'zip'],
    resource_type: 'auto'
  }
});

// Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'task-manager/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const uploadProject = multer({ storage: projectStorage });
const uploadTask = multer({ storage: taskStorage });
const uploadProfile = multer({ storage: profileStorage });

module.exports = {
  cloudinary,
  uploadProject,
  uploadTask,
  uploadProfile
};

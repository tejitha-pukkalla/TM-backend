const Project = require('../models/Project.model');
const ProjectMember = require('../models/ProjectMember.model');
const Notification = require('../models/Notification.model');
const { success, error, paginated } = require('../utils/response');
const { PROJECT_ROLES } = require('../config/constants');

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Superadmin/Team Lead)
exports.createProject = async (req, res, next) => {
  try {
    const { title, description, requirements, members } = req.body;
    
    // Parse members if it's a string (from FormData)
    let parsedMembers = [];
    if (members) {
      try {
        parsedMembers = typeof members === 'string' ? JSON.parse(members) : members;
      } catch (err) {
        console.error('Error parsing members:', err);
        parsedMembers = [];
      }
    }

    // Handle uploaded files from Cloudinary
    const documentUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documentUrls.push(file.path); // Cloudinary returns 'path' as the URL
      });
    }

    // Create project
    const project = await Project.create({
      title,
      description,
      requirements,
      documents: documentUrls,
      createdBy: req.user._id,
      approvedBy: req.user._id,
      approvalStatus: 'approved' // Auto-approved
    });

    // Add project members
    if (parsedMembers && Array.isArray(parsedMembers) && parsedMembers.length > 0) {
      const projectMembers = parsedMembers.map(member => ({
        projectId: project._id,
        userId: member.userId,
        roleInProject: member.roleInProject,
        assignedBy: req.user._id
      }));

      await ProjectMember.insertMany(projectMembers);

      // Create notifications for all members
      const notifications = parsedMembers.map(member => ({
        userId: member.userId,
        type: 'project_created',
        title: 'Added to New Project',
        message: `You have been added to project: ${title}`,
        referenceId: project._id,
        referenceType: 'project'
      }));

      await Notification.insertMany(notifications);
    }

    // Populate project with members
    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    return success(res, { project: populatedProject }, 'Project created successfully', 201);
  } catch (err) {
    console.error('Create project error:', err);
    next(err);
  }
};


// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getAllProjects = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    const userRole = req.user.globalRole;

    let projectIds = [];

    // If not superadmin or teamlead, get only user's projects where they are members
    if (!['superadmin', 'teamlead'].includes(userRole)) {
      const userProjects = await ProjectMember.find({ 
        userId,
        isActive: true 
      }).select('projectId');
      projectIds = userProjects.map(p => p.projectId);
    }

    // Build filter
    const filter = {};
    
    // Apply project restriction for projectlead and member
    if (!['superadmin', 'teamlead'].includes(userRole)) {
      if (projectIds.length === 0) {
        // No projects found for this user
        return paginated(res, [], page, limit, 0, 'No projects found');
      }
      filter._id = { $in: projectIds };
    }
    
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get projects with pagination
    const skip = (page - 1) * limit;
    const projects = await Project.find(filter)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(filter);

    return paginated(res, projects, page, limit, total, 'Projects retrieved successfully');
  } catch (err) {
    console.error('Get projects error:', err);
    next(err);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email globalRole')
      .populate('approvedBy', 'name email');

    if (!project) {
      return error(res, 'Project not found', 404);
    }

    // Get project members with their details
    const members = await ProjectMember.find({ 
      projectId: req.params.id,
      isActive: true 
    })
    .populate('userId', 'name email department profilePic')
    .populate('assignedBy', 'name email');

    // Get task statistics for this project
    const Task = require('../models/Task.model');
    const taskStats = await Task.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return success(res, { 
      project, 
      members,
      taskStats
    }, 'Project retrieved successfully');
  } catch (err) {
    console.error('Get project error:', err);
    next(err);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Superadmin/Team Lead)
exports.updateProject = async (req, res, next) => {
  try {
    const { title, description, requirements, status, completionPercentage } = req.body;

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return error(res, 'Project not found', 404);
    }

    // Update fields
    if (title) project.title = title;
    if (description) project.description = description;
    if (requirements) project.requirements = requirements;
    if (status) project.status = status;
    if (completionPercentage !== undefined) {
      project.completionPercentage = completionPercentage;
    }

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    return success(res, { project: updatedProject }, 'Project updated successfully');
  } catch (err) {
    console.error('Update project error:', err);
    next(err);
  }
};


// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private (Superadmin/Team Lead)
exports.addProjectMember = async (req, res, next) => {
  try {
    const { userId, roleInProject } = req.body;

    // Validate userId format
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return error(res, 'Invalid user ID format', 400);
    }

    // Check if project exists
    const project = await Project.findById(req.params.id);
    if (!project) {
      return error(res, 'Project not found', 404);
    }

    // Check if already a member
    const existing = await ProjectMember.findOne({
      projectId: req.params.id,
      userId,
      isActive: true
    });

    if (existing) {
      return error(res, 'User is already a member of this project', 400);
    }

    // Add member
    const member = await ProjectMember.create({
      projectId: req.params.id,
      userId,
      roleInProject,
      assignedBy: req.user._id
    });

    // Create notification
    await Notification.create({
      userId,
      type: 'project_created',
      title: 'Added to Project',
      message: `You have been added to project: ${project.title}`,
      referenceId: project._id,
      referenceType: 'project'
    });

    const populatedMember = await ProjectMember.findById(member._id)
      .populate('userId', 'name email department profilePic')
      .populate('assignedBy', 'name email');

    return success(res, { member: populatedMember }, 'Member added successfully', 201);
  } catch (err) {
    console.error('Add member error:', err);
    next(err);
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private (Superadmin/Team Lead)
exports.removeProjectMember = async (req, res, next) => {
  try {
    const member = await ProjectMember.findOneAndUpdate(
      {
        projectId: req.params.id,
        userId: req.params.userId
      },
      { isActive: false },
      { new: true }
    );

    if (!member) {
      return error(res, 'Member not found in this project', 404);
    }

    return success(res, null, 'Member removed successfully');
  } catch (err) {
    console.error('Remove member error:', err);
    next(err);
  }
};




// Replace the existing getProjectMembers function with this:

// exports.getProjectMembers = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if project exists
//     const project = await Project.findById(id);
//     if (!project) {
//       return res.status(404).json({
//         success: false,
//         message: 'Project not found',
//         timestamp: new Date().toISOString()
//       });
//     }

//     // Fetch members from ProjectMember collection
//     const members = await ProjectMember.find({ 
//       projectId: id,
//       isActive: true 
//     })
//     .populate('userId', 'name email department profilePic globalRole isActive')
//     .populate('assignedBy', 'name email');

//     // Filter out any members with null/undefined userId (deleted users)
//     const activeMembers = members.filter(member => member.userId && member.userId.isActive);

//     res.status(200).json({
//       success: true,
//       data: activeMembers,
//       count: activeMembers.length,
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     console.error('Error fetching project members:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch project members',
//       error: error.message,
//       timestamp: new Date().toISOString()
//     });
//   }
// };






// Replace the existing getProjectMembers function with this:

exports.getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch members from ProjectMember collection (includes member, projectlead, teamlead)
    const members = await ProjectMember.find({ 
      projectId: id,
      isActive: true 
    })
    .populate('userId', 'name email department profilePic globalRole isActive')
    .populate('assignedBy', 'name email');

    // Filter out any members with null/undefined userId (deleted users)
    const activeMembers = members.filter(member => member.userId && member.userId.isActive);

    // IMPORTANT: activeMembers lo member, projectlead, teamlead anni roles untayi
    // Because ProjectMember schema lo roleInProject field lo anni roles store avthayi

    res.status(200).json({
      success: true,
      data: activeMembers,
      count: activeMembers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project members',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};


// ADD THIS NEW FUNCTION - Get members who can be assigned tasks (all roles)
exports.getAssignableMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch ALL active members including member, projectlead, teamlead
    const members = await ProjectMember.find({ 
      projectId: id,
      isActive: true 
    })
    .populate({
      path: 'userId',
      select: 'name email department profilePic globalRole isActive',
      match: { isActive: true } // Only active users
    })
    .populate('assignedBy', 'name email');

    // Filter out null userId (deleted/inactive users)
    const assignableMembers = members
      .filter(member => member.userId)
      .map(member => ({
        _id: member._id,
        userId: member.userId._id,
        name: member.userId.name,
        email: member.userId.email,
        department: member.userId.department,
        profilePic: member.userId.profilePic,
        globalRole: member.userId.globalRole,
        roleInProject: member.roleInProject, // member, projectlead, or teamlead
        assignedBy: member.assignedBy,
        joinedAt: member.joinedAt
      }));

    res.status(200).json({
      success: true,
      data: assignableMembers,
      count: assignableMembers.length,
      message: 'All assignable project members retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching assignable members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignable members',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
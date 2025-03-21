// controllers/exhibitorController.js
const bcrypt = require('bcryptjs');
const Exhibitor = require('../models/Exhibitor');
const { exhibitorSchema, exhibitorLoginSchema, exhibitorChildSchema } = require('../validators/exhibitorValidator');
const schemaValidator = require('../validators/schemaValidator');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');
const { successResponse, notFoundResponse } = require('../utils/sendResponse');
const emailController = require("./emailController");
const ExhibitorChildUser = require('../models/ExhibitorChildUser');

exports.register = async (req, res) => {
    try {
        const validation = schemaValidator(exhibitorSchema, req.body);
        if (validation.success) {
            const { email } = req.body;
            const existingExhibitor = await Exhibitor.findOne({ email });
            if (existingExhibitor) {
                return res.status(400).json({ status: 0, message: 'Email already exists' });
            }
            req.body.password = await bcrypt.hash(req.body.password, 10);
            const exhibitor = new Exhibitor(req.body);
            const exhibitorData = await exhibitor.save();
            await emailController.sendExhibitorRegisteredMail(exhibitorData._id);

            const successObj = successResponse('Exhibitor registered successfully', exhibitorData)
            res.status(successObj.status).send(successObj);
        } else {
            res.status(401).json({ message: validation.errors });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

// Get all visitors
exports.resetPassword = async (req, res) => {
    const { oldPassword, newPassword, exhibitorId } = req.body;

    try {
        // Find exhibitor by ID
        const exhibitor = await Exhibitor.findById(exhibitorId);
        if (!exhibitor) return res.status(404).json({ status: 400, message: 'Exhibitor not found' });

        // Check if old password matches
        const isMatch = await bcrypt.compare(oldPassword, exhibitor.password);
        if (!isMatch) return res.status(400).json({ status: 400, message: 'Old password is incorrect' });


        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Update exhibitor's password
        exhibitor.password = hashedPassword;
        await exhibitor.save();
        await emailController.sendForgotPasswordSuccess(exhibitor);
        const successObj = successResponse('Password updated successfully', exhibitor);
        res.status(successObj.status).send(successObj);
        // res.status(200).json({ status: 200, message: 'Password successfully reset' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

exports.login = async (req, res, next) => {
    try {
        const validation = schemaValidator(exhibitorLoginSchema, req.body);
        if (validation.success) {
            const { email, password } = req.body;
            const exhibitor = await Exhibitor.findOne({ email });
            if (!exhibitor) {
                return res.status(404).json({ status: 0, message: 'Email ID doesn’t exist. Please register' });
            } else if (!exhibitor.active) {
                return res.status(404).json({ status: 0, message: 'Pending Approval. Please try again once approved' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, exhibitor.password);
            if (isMatch) {
                const currentDate = new Date();
                const utcFormat = currentDate.toISOString();
                const updatedLoggeduser = await Exhibitor.findByIdAndUpdate(exhibitor.id,
                    {
                        loggedIn: true,
                        loggedInIP: req.body.loggedInIP,
                        loggedInTime: utcFormat
                    }, { new: true });

                // Create JWT Payload
                const payload = {
                    id: exhibitor.id,
                    email: exhibitor.email
                };
                // Sign token
                jwt.sign(
                    payload,
                    jwtSecret,
                    { expiresIn: '3650d' },
                    (err, token) => {
                        res.json({
                            success: true,
                            token: 'Bearer ' + token,
                            id: exhibitor.id,
                            name: exhibitor.name
                        });
                    }
                );
            } else {
                return res.status(400).json({ status: 0, message: 'Username/Password is incorrect' });
            }
        } else {
            res.status(401).json({ status: 0, message: validation.errors });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

// Logout a loggedOut
exports.loggedOut = async (req, res) => {
    try {
        const loggedOutUpdate = await Exhibitor.findByIdAndUpdate(req.params.id, { loggedIn: false }, { new: true });
        if (loggedOutUpdate) {
            res.json({ success: true, message: "Logged out" });
        } else {
            res.status(401).json({ message: "Something wrong" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.childLogin = async (req, res, next) => {
    try {
        const validation = schemaValidator(exhibitorLoginSchema, req.body);
        if (validation.success) {
            const { email, password } = req.body;
            const exhibitor = await ExhibitorChildUser.findOne({ email });
            if (!exhibitor) {
                return res.status(404).json({ status: 0, message: 'Email ID doesn’t exist. Please register' });
            } else if (!exhibitor.active) {
                return res.status(404).json({ status: 0, message: 'Pending Approval. Please try again once approved' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, exhibitor.password);
            if (isMatch) {
                const currentDate = new Date();
                const utcFormat = currentDate.toISOString();
                const updatedLoggeduser = await ExhibitorChildUser.findByIdAndUpdate(exhibitor.id,
                    {
                        loggedIn: true,
                        loggedInIP: req.body.loggedInIP,
                        loggedInTime: utcFormat
                    }, { new: true });

                // Create JWT Payload
                const payload = {
                    id: exhibitor.id,
                    email: exhibitor.email,
                    exhibitorId: exhibitor.exhibitor,
                    role: 'Stall Manager'
                };
                // Sign token
                jwt.sign(
                    payload,
                    jwtSecret,
                    { expiresIn: '3650d' },
                    (err, token) => {
                        res.json({
                            success: true,
                            token: 'Bearer ' + token,
                            id: exhibitor.id,
                            name: exhibitor.name,
                            exhibitorId: exhibitor.exhibitor,
                            role: 'Stall Manager'
                        });
                    }
                );
            } else {
                return res.status(400).json({ status: 0, message: 'Username/Password is incorrect' });
            }
        } else {
            res.status(401).json({ status: 0, message: validation.errors });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

function generateRandomPassword(length = 8) {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+[]{}|;:,.<>?';

    let password = '';

    // Ensure at least one character from each required set
    password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
    password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill the rest of the password length with random characters from all sets
    const allChars = uppercaseChars + lowercaseChars + numbers + specialChars;
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable sequences
    password = password.split('').sort(() => 0.5 - Math.random()).join('');

    return password;
}

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the email exists
        const exhibitor = await Exhibitor.findOne({ email });
        if (!exhibitor) {
            return res.status(404).json({ status: 0, message: 'Email not found' });
        }

        // Generate a random password
        const randomPassword = generateRandomPassword();

        // Hash the new password before saving (use bcrypt or similar)
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // Update the user's password
        exhibitor.password = hashedPassword;
        await exhibitor.save();

        // Send the new password to the user's email
        const forgot = await emailController.sendForgotPassword(exhibitor, randomPassword);
        // Respond with success message
        res.status(200).json({ status: 1, message: 'Password reset successfully. Please check your email.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getAllExhibitor = async (req, res) => {
    try {
        const exhibitors = await Exhibitor.find({});
        if (!exhibitors || exhibitors.length === 0) {
            return res.status(404).json({ message: 'No exhibitors found' });
        }
        const modifiedExhibitors = exhibitors.map(exhibitor => ({
            _id: exhibitor._id,
            name: exhibitor.name,
            email: exhibitor.email,
            companyName: exhibitor.companyName
        }));
        const successObj = successResponse('Exhibitor List', modifiedExhibitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getChatExhibitor = async (req, res) => {
    try {
        const exhibitors = await Exhibitor.find({ _id: req.params.id });

        if (!exhibitors || exhibitors.length === 0) {
            return res.status(404).json({ message: 'No exhibitors found' });
        }
        const modifiedExhibitors = exhibitors.map(exhibitor => ({
            _id: exhibitor._id,
            name: exhibitor.name,
            email: exhibitor.email,
            companyName: exhibitor.companyName
        }));
        const successObj = successResponse('Exhibitor List', modifiedExhibitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllLoggedInExhibitorList = async (req, res) => {
    try {
        const exhibitor = await Exhibitor.find({ loggedIn: true }).sort({ updatedAt: -1 });
        if (exhibitor.length == 0) {
            const successObj = notFoundResponse('No exhibitor List');
            res.status(successObj.status).send(successObj);
            return;
        }
        const modifiedexhibitors = exhibitor.map(exhibitor => ({
            _id: exhibitor._id,
            name: exhibitor.name,
            phone: exhibitor.phone,
            email: exhibitor.email,
            companyName: exhibitor.companyName,
            loggedInTime: exhibitor.loggedInTime,
            loggedInIP: exhibitor.loggedInIP
        }));
        const successObj = successResponse('exhibitor List', modifiedexhibitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllJoinedExhibitorList = async (req, res) => {
    try {
        const exhibitor = await Exhibitor.find({ active: true }).sort({ updatedAt: -1 });
        if (exhibitor.length == 0) {
            const successObj = notFoundResponse('No exhibitor List');
            res.status(successObj.status).send(successObj);
            return;
        }
        const modifiedexhibitors = exhibitor.map(exhibitor => ({
            _id: exhibitor._id,
            name: exhibitor.name,
            phone: exhibitor.phone,
            email: exhibitor.email,
            companyName: exhibitor.companyName,
            loggedInTime: exhibitor.loggedInTime,
            loggedInIP: exhibitor.loggedInIP
        }));
        const successObj = successResponse('exhibitor List', modifiedexhibitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getExhibitorById = async (req, res) => {
    try {
        const exhibitor = await Exhibitor.findById(req.params.id);
        if (!exhibitor) {
            return res.status(404).json({ message: 'Exhibitor entry not found' });
        }
        const modifiedExhibitor = {
            _id: exhibitor._id,
            name: exhibitor.name,
            email: exhibitor.email,
            companyName: exhibitor.companyName,
            phone: exhibitor.phone,
            companyAddress: exhibitor.companyAddress,
        };
        const successObj = successResponse('Exhibitor Details', modifiedExhibitor);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addUser = async (req, res) => {
    try {
        const validation = schemaValidator(exhibitorChildSchema, req.body);
        if (validation.success) {
            const { email } = req.body;
            const existingExhibitorChild = await ExhibitorChildUser.findOne({ email });
            if (existingExhibitorChild) {
                return res.status(400).json({ status: 0, message: 'Email already exists' });
            }
            req.body.password = await bcrypt.hash(req.body.password, 10);
            const exhibitorChild = new ExhibitorChildUser(req.body);
            const exhibitorChildData = await exhibitorChild.save();
            await emailController.sendExhibitorChildRegisteredMail(exhibitorChildData._id);

            const successObj = successResponse('Exhibitor Add User added successfully', exhibitorChildData)
            res.status(successObj.status).send(successObj);
        } else {
            res.status(401).json({ message: validation.errors });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.fetchAllChildExhibitor = async (req, res) => {
    try {
        const records = await ExhibitorChildUser.find({})
        const resp = {
            status: 200,
            message: "List of Child Exhibitors",
            data: records,
        };
        res.status(resp.status).send(resp);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
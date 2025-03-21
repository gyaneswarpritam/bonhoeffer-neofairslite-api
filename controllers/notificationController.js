
const ExhibitorNotification = require('../models/ExhibitorNotification');
const VisitorNotification = require('../models/VisitorNotification');
const { successResponse, successResponseWithRecordCount } = require('../utils/sendResponse');

exports.createVisitorNotification = async (req, res) => {
    try {
        const notificationDetails = await VisitorNotification.create(req.body);
        const successObj = successResponse('Visitor Notification Created', notificationDetails)
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.createExhibitorNotification = async (req, res) => {
    try {
        const notificationDetails = await ExhibitorNotification.create(req.body);
        const successObj = successResponse('Exhibitor Notification Created', notificationDetails)
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getVisitorNotification = async (req, res) => {
    try {
        const visitorNotify = await VisitorNotification.find({ visitor: req.params.visitorId, unread: false })
            .populate({
                path: 'exhibitor',
                select: 'name companyName email phone' // Select only the fields you need
            })
            .sort({ updatedAt: -1 })
            .exec();
        const totalCount = await VisitorNotification.countDocuments();
        const successObj = successResponseWithRecordCount('Visitor Notification List', visitorNotify, totalCount);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getVisitorAllNotification = async (req, res) => {
    try {
        const visitorNotify = await VisitorNotification.find({ visitor: req.params.visitorId })
            .populate({
                path: 'exhibitor',
                select: 'name companyName email phone' // Select only the fields you need
            })
            .sort({ updatedAt: -1 })
            .exec();
        const totalCount = await VisitorNotification.countDocuments();
        const successObj = successResponseWithRecordCount('Visitor Notification List', visitorNotify, totalCount);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getExhibitorNotification = async (req, res) => {
    try {
        const exhibitorNotify = await ExhibitorNotification.find({ exhibitor: req.params.exhibitorId, unread: false })
            .populate({
                path: 'visitor',
                select: 'name companyName email phone'
            })
            .sort({ updatedAt: -1 })
            .exec();
        const totalCount = await ExhibitorNotification.countDocuments();
        const successObj = successResponseWithRecordCount('Exhibitor Notification List', exhibitorNotify, totalCount);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getExhibitorAllNotification = async (req, res) => {
    try {
        const exhibitorNotify = await ExhibitorNotification.find({ exhibitor: req.params.exhibitorId })
            .populate({
                path: 'visitor',
                select: 'name companyName email phone'
            })
            .sort({ updatedAt: -1 })
            .exec();
        const totalCount = await ExhibitorNotification.countDocuments();
        const successObj = successResponseWithRecordCount('Exhibitor Notification List', exhibitorNotify, totalCount);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        // Update all notifications to unread: true for the given exhibitorId
        const result = await ExhibitorNotification.updateMany(
            { exhibitor: req.params.exhibitorId, unread: false },
            { $set: { unread: true } }
        );

        if (result.nModified > 0) {
            res.status(200).json({ message: 'All notifications marked as read.' });
        } else {
            res.status(404).json({ message: 'No unread notifications found.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAllAsReadVisitor = async (req, res) => {
    try {
        // Update all notifications to unread: true for the given exhibitorId
        const result = await VisitorNotification.updateMany(
            { visitor: req.params.visitorId, unread: false },
            { $set: { unread: true } }
        );

        if (result.nModified > 0) {
            res.status(200).json({ message: 'All notifications marked as read.' });
        } else {
            res.status(404).json({ message: 'No unread notifications found 11.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




const Exhibitor = require("../models/Exhibitor");
const ExhibitorMessages = require("../models/ExhibitorMessage");
const Visitor = require("../models/Visitor");
const { successResponse } = require("../utils/sendResponse");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await ExhibitorMessages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        time: msg.createdAt
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.getChatUser = async (req, res, next) => {
  const exhibitorId = req.params.id;

  try {
    const messages = await ExhibitorMessages.find({
      users: { $in: [exhibitorId] }
    }).sort({ updatedAt: -1 });

    const userChatInfo = {};
    messages.forEach(message => {
      message.users.forEach(user => {
        if (user !== exhibitorId) {
          if (!userChatInfo[user]) {
            userChatInfo[user] = {
              unread: 0,
              lastMessage: null,
              lastMessageFromVisitor: null,
              lastMessageFromExhibitor: null,
            };
          }

          if (message.sender.toString() === exhibitorId) {
            if (
              !userChatInfo[user].lastMessageFromExhibitor ||
              message.updatedAt > userChatInfo[user].lastMessageFromExhibitor.updatedAt
            ) {
              userChatInfo[user].lastMessageFromExhibitor = message;
            }
          } else {
            if (
              !userChatInfo[user].lastMessageFromVisitor ||
              message.updatedAt > userChatInfo[user].lastMessageFromVisitor.updatedAt
            ) {
              userChatInfo[user].lastMessageFromVisitor = message;
            }
            if (!message.read) {
              userChatInfo[user].unread++;
            }
          }

          userChatInfo[user].lastMessage =
            (userChatInfo[user].lastMessageFromVisitor && userChatInfo[user].lastMessageFromExhibitor)
              ? (userChatInfo[user].lastMessageFromVisitor.updatedAt > userChatInfo[user].lastMessageFromExhibitor.updatedAt
                ? userChatInfo[user].lastMessageFromVisitor
                : userChatInfo[user].lastMessageFromExhibitor)
              : (userChatInfo[user].lastMessageFromVisitor || userChatInfo[user].lastMessageFromExhibitor);
        }
      });
    });

    const userIds = Object.keys(userChatInfo);
    const visitors = await Exhibitor.find({ _id: { $in: userIds } });

    const modifiedVisitors = visitors.map(visitor => {
      const chatInfo = userChatInfo[visitor._id.toString()];
      return {
        _id: visitor._id,
        name: visitor.name,
        email: visitor.email,
        companyName: visitor.companyName,
        unread: chatInfo.unread,
        lastMessage: chatInfo.lastMessage?.message?.text || "", // Use optional chaining to avoid errors
        lastMessageFrom: chatInfo.lastMessage?.sender.toString() === exhibitorId ? 'Exhibitor' : 'Visitor'
      };
    });

    const successObj = successResponse('Chat Visitor List', modifiedVisitors);
    res.status(successObj.status).send(successObj);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports.getChatVisitors = async (req, res, next) => {
  const visitorId = req.params.id;

  try {
    const messages = await ExhibitorMessages.find({
      users: { $in: [visitorId] }
    }).sort({ updatedAt: -1 });

    const userChatInfo = {};
    messages.forEach(message => {
      message.users.forEach(user => {
        if (user !== visitorId) {
          if (!userChatInfo[user]) {
            userChatInfo[user] = {
              unread: 0,
              lastMessage: null,
              lastMessageFromVisitor: null,
              lastMessageFromExhibitor: null,
            };
          }

          if (message.sender.toString() === visitorId) {
            if (
              !userChatInfo[user].lastMessageFromVisitor ||
              message.updatedAt > userChatInfo[user].lastMessageFromVisitor.updatedAt
            ) {
              userChatInfo[user].lastMessageFromVisitor = message;
            }
          } else {
            if (
              !userChatInfo[user].lastMessageFromExhibitor ||
              message.updatedAt > userChatInfo[user].lastMessageFromExhibitor.updatedAt
            ) {
              userChatInfo[user].lastMessageFromExhibitor = message;
            }
            if (!message.read) {
              userChatInfo[user].unread++;
            }
          }

          userChatInfo[user].lastMessage =
            (userChatInfo[user].lastMessageFromVisitor && userChatInfo[user].lastMessageFromExhibitor)
              ? (userChatInfo[user].lastMessageFromVisitor.updatedAt > userChatInfo[user].lastMessageFromExhibitor.updatedAt
                ? userChatInfo[user].lastMessageFromVisitor
                : userChatInfo[user].lastMessageFromExhibitor)
              : (userChatInfo[user].lastMessageFromVisitor || userChatInfo[user].lastMessageFromExhibitor);
        }
      });
    });

    const userIds = Object.keys(userChatInfo);
    const exhibitors = await Visitor.find({ _id: { $in: userIds } });

    const modifiedExhibitors = exhibitors.map(visitor => {
      const chatInfo = userChatInfo[visitor._id.toString()];
      return {
        _id: visitor._id,
        name: visitor.name,
        email: visitor.email,
        companyName: visitor.companyName,
        unread: chatInfo.unread,
        lastMessage: chatInfo.lastMessage?.message?.text || "", // Use optional chaining
        lastMessageFrom: chatInfo.lastMessage?.sender.toString() === visitorId ? 'Visitor' : 'Exhibitor'
      };
    });

    const successObj = successResponse('Chat Visitor List', modifiedExhibitors);
    res.status(successObj.status).send(successObj);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports.checkChatUserExist = async (req, res, next) => {
  try {
    // Check if a message with the same sender and receiver IDs exists
    const existingMessage = await ExhibitorMessages.findOne({
      users: { $all: [req.body.from, req.body.to] }
    });
    if (existingMessage) return res.status(200).json({ status: 1, message: 'Chat already exist' });
    return res.status(200).json({ status: 0, message: 'Chat not exist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const data = await ExhibitorMessages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

module.exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    await ExhibitorMessages.updateMany(
      {
        users: { $all: [from, to] },
        sender: to,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    res.status(200).json({ message: "Messages marked as read." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
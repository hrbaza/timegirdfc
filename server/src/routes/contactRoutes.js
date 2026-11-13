/* POST /api/contact — the public contact form.
   Saves the message, then emails it to the team (CONTACT_TO, default the site
   inbox) with Reply-To set to the sender. Rate-limited, with a honeypot field. */
const express = require("express");
const rateLimit = require("express-rate-limit");
const ContactMessage = require("../models/ContactMessage");
const { sendMail } = require("../utils/mailer");
const { catchAsync, AppError } = require("../utils/AppError");

const router = express.Router();
const TOPICS = ["General", "Correction", "Story tip", "Image or copyright", "Partnership"];
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "fail", message: "Too many messages from this connection. Please try again later or email us directly." },
});

router.post("/", limiter, catchAsync(async (req, res, next) => {
  const b = req.body || {};
  // Bots fill the hidden "website" field; pretend it worked and drop it.
  if (String(b.website || "").trim()) return res.json({ status: "success" });
  const name = String(b.name || "").trim().slice(0, 80);
  const email = String(b.email || "").trim().slice(0, 120);
  const message = String(b.message || "").trim().slice(0, 4000);
  const topic = TOPICS.includes(b.topic) ? b.topic : "General";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
    return next(new AppError("Please add your name, a valid email and a message of at least 10 characters.", 400));
  }

  const doc = await ContactMessage.create({ name, email, topic, message });
  const to = process.env.CONTACT_TO || "timegridfc@gmail.com";
  let sent = false;
  try {
    const r = await sendMail({
      to,
      replyTo: `${name.replace(/[<>"\r\n]/g, "")} <${email}>`,
      subject: `[Time Grid FC contact] ${topic}: ${name}`.replace(/[\r\n]/g, " "),
      text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}\n\n(Message id ${doc._id})`,
    });
    sent = !!r.delivered;
  } catch (e) { console.error("Contact email failed:", e.message); }
  if (sent) await ContactMessage.updateOne({ _id: doc._id }, { emailed: true });
  if (!sent) return next(new AppError(`Your message was saved but could not be emailed right now. Please also email us at ${to}.`, 503));
  res.json({ status: "success" });
}));

module.exports = router;

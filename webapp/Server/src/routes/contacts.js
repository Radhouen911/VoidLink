const express = require("express");
const db = require("../database/db");
const { requireBothSessions } = require("../middleware/auth");

const router = express.Router();

// Add user to contacts (requires both sessions)
router.post("/add", requireBothSessions, async (req, res) => {
  try {
    const { username, alias } = req.body;

    if (!username) {
      return res.status(400).json({
        error: "MISSING_USERNAME",
        message: "Username is required",
      });
    }

    // Find contact's crypto profile
    const contactResult = await db.query(
      `
      SELECT cp.id as crypto_profile_id, a.username
      FROM accounts a
      INNER JOIN crypto_profiles cp ON a.id = cp.account_id
      WHERE a.username = $1 AND a.account_status = 'active'
    `,
      [username]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "User not found or has no crypto profile",
      });
    }

    const contact = contactResult.rows[0];

    // Prevent adding self as contact
    if (contact.crypto_profile_id === req.cryptoSession.cryptoProfileId) {
      return res.status(400).json({
        error: "CANNOT_ADD_SELF",
        message: "Cannot add yourself as a contact",
      });
    }

    // Check if contact already exists
    const existingResult = await db.query(
      "SELECT id FROM contacts WHERE owner_crypto_id = $1 AND contact_crypto_id = $2",
      [req.cryptoSession.cryptoProfileId, contact.crypto_profile_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: "CONTACT_EXISTS",
        message: "User is already in your contacts",
      });
    }

    // Add contact
    const result = await db.query(
      `
      INSERT INTO contacts (owner_crypto_id, contact_crypto_id, contact_alias) 
      VALUES ($1, $2, $3) 
      RETURNING id, added_at
    `,
      [
        req.cryptoSession.cryptoProfileId,
        contact.crypto_profile_id,
        alias || null,
      ]
    );

    const newContact = result.rows[0];

    // Log contact addition
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contact_added",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        contact_username: username,
        contact_id: newContact.id,
      }
    );

    res.status(201).json({
      success: true,
      message: "Contact added successfully",
      data: {
        contactId: newContact.id,
        username: contact.username,
        alias: alias || null,
        addedAt: newContact.added_at,
      },
    });
  } catch (error) {
    console.error("Add contact error:", error);
    res.status(500).json({
      error: "ADD_CONTACT_FAILED",
      message: "Failed to add contact",
    });
  }
});

// Get user's contacts list (requires both sessions)
router.get("/", requireBothSessions, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        c.id as contact_id,
        c.contact_alias,
        c.user_declared_verified,
        c.added_at,
        a.username,
        cp.key_uploaded_at
      FROM contacts c
      INNER JOIN crypto_profiles cp ON c.contact_crypto_id = cp.id
      INNER JOIN accounts a ON cp.account_id = a.id
      WHERE c.owner_crypto_id = $1
      ORDER BY c.added_at DESC
    `,
      [req.cryptoSession.cryptoProfileId]
    );

    // Log contacts access
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contacts_accessed",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        contacts_count: result.rows.length,
      }
    );

    res.json({
      success: true,
      data: {
        contacts: result.rows.map((contact) => ({
          contactId: contact.contact_id,
          username: contact.username,
          alias: contact.contact_alias,
          userDeclaredVerified: contact.user_declared_verified,
          addedAt: contact.added_at,
          keyUploadedAt: contact.key_uploaded_at,
        })),
        totalContacts: result.rows.length,
      },
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      error: "CONTACTS_FETCH_FAILED",
      message: "Failed to retrieve contacts",
    });
  }
});

// Update contact trust status (requires both sessions)
router.put(
  "/:contactId/trust-status",
  requireBothSessions,
  async (req, res) => {
    try {
      const { contactId } = req.params;
      const { verified } = req.body;

      if (typeof verified !== "boolean") {
        return res.status(400).json({
          error: "INVALID_VERIFIED_STATUS",
          message: "Verified status must be a boolean",
        });
      }

      // Update contact verification status (user-declared, not cryptographically enforced)
      const result = await db.query(
        `
      UPDATE contacts 
      SET user_declared_verified = $1 
      WHERE id = $2 AND owner_crypto_id = $3
      RETURNING id, user_declared_verified
    `,
        [verified, contactId, req.cryptoSession.cryptoProfileId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "CONTACT_NOT_FOUND",
          message: "Contact not found or not authorized",
        });
      }

      const contact = result.rows[0];

      // Log trust status change
      await db.logAuditEvent(
        req.accountSession.accountId,
        req.cryptoSession.cryptoProfileId,
        "contact_trust_updated",
        "messaging",
        req.ip,
        req.get("User-Agent"),
        {
          contact_id: contactId,
          verified_status: verified,
        }
      );

      res.json({
        success: true,
        message: "Contact trust status updated",
        data: {
          contactId: contact.id,
          userDeclaredVerified: contact.user_declared_verified,
        },
      });
    } catch (error) {
      console.error("Update contact trust error:", error);
      res.status(500).json({
        error: "TRUST_UPDATE_FAILED",
        message: "Failed to update contact trust status",
      });
    }
  }
);

// Remove contact (requires both sessions)
router.delete("/:contactId", requireBothSessions, async (req, res) => {
  try {
    const { contactId } = req.params;

    // Delete contact
    const result = await db.query(
      "DELETE FROM contacts WHERE id = $1 AND owner_crypto_id = $2 RETURNING id",
      [contactId, req.cryptoSession.cryptoProfileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "CONTACT_NOT_FOUND",
        message: "Contact not found or not authorized",
      });
    }

    // Log contact removal
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contact_removed",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        contact_id: contactId,
      }
    );

    res.json({
      success: true,
      message: "Contact removed successfully",
      data: {
        contactId,
      },
    });
  } catch (error) {
    console.error("Remove contact error:", error);
    res.status(500).json({
      error: "CONTACT_REMOVE_FAILED",
      message: "Failed to remove contact",
    });
  }
});

module.exports = router;

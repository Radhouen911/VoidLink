const express = require("express");
const db = require("../database/db");
const { requireBothSessions } = require("../middleware/auth");

const router = express.Router();

// Send contact request (requires both sessions)
router.post("/request", requireBothSessions, async (req, res) => {
  try {
    const { username, message } = req.body;

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

    // Check existing relationship status
    const statusResult = await db.query(
      "SELECT * FROM get_contact_status($1, $2)",
      [req.cryptoSession.cryptoProfileId, contact.crypto_profile_id]
    );

    const relationshipStatus = statusResult.rows[0];

    if (relationshipStatus.relationship_status === "mutual") {
      return res.status(409).json({
        error: "ALREADY_CONTACTS",
        message: "You are already contacts with this user",
      });
    }

    if (relationshipStatus.relationship_status === "request_sent") {
      return res.status(409).json({
        error: "REQUEST_ALREADY_SENT",
        message: "Contact request already sent to this user",
      });
    }

    if (relationshipStatus.relationship_status === "blocked") {
      return res.status(403).json({
        error: "CONTACT_BLOCKED",
        message: "Cannot send contact request to this user",
      });
    }

    // If there's an incoming request, accept it instead
    if (relationshipStatus.relationship_status === "request_received") {
      const acceptResult = await db.query(
        `
        UPDATE contacts 
        SET contact_status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
        WHERE owner_crypto_id = $1 AND contact_crypto_id = $2
        RETURNING id
      `,
        [contact.crypto_profile_id, req.cryptoSession.cryptoProfileId]
      );

      // Also create the reverse relationship
      await db.query(
        `
        INSERT INTO contacts (owner_crypto_id, contact_crypto_id, contact_status, accepted_at) 
        VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP)
      `,
        [req.cryptoSession.cryptoProfileId, contact.crypto_profile_id]
      );

      await db.logAuditEvent(
        req.accountSession.accountId,
        req.cryptoSession.cryptoProfileId,
        "contact_request_accepted",
        "messaging",
        req.ip,
        req.get("User-Agent"),
        { contact_username: username }
      );

      return res.status(200).json({
        success: true,
        message: "Contact request accepted (mutual contact established)",
        data: { contactId: acceptResult.rows[0].id, status: "accepted" },
      });
    }

    // Send new contact request
    const result = await db.query(
      `
      INSERT INTO contacts (owner_crypto_id, contact_crypto_id, contact_status, request_message) 
      VALUES ($1, $2, 'pending', $3) 
      RETURNING id, added_at
    `,
      [
        req.cryptoSession.cryptoProfileId,
        contact.crypto_profile_id,
        message || null,
      ]
    );

    const newRequest = result.rows[0];

    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contact_request_sent",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      { contact_username: username, request_id: newRequest.id }
    );

    res.status(201).json({
      success: true,
      message: "Contact request sent successfully",
      data: {
        requestId: newRequest.id,
        username: contact.username,
        status: "pending",
        sentAt: newRequest.added_at,
      },
    });
  } catch (error) {
    console.error("Send contact request error:", error);
    res.status(500).json({
      error: "CONTACT_REQUEST_FAILED",
      message: "Failed to send contact request",
    });
  }
});

// Accept contact request (requires both sessions)
router.post("/:requestId/accept", requireBothSessions, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find and update the contact request
    const result = await db.query(
      `
      UPDATE contacts 
      SET contact_status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND contact_crypto_id = $2 AND contact_status = 'pending'
      RETURNING owner_crypto_id, contact_crypto_id
    `,
      [requestId, req.cryptoSession.cryptoProfileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "REQUEST_NOT_FOUND",
        message: "Contact request not found or already processed",
      });
    }

    const { owner_crypto_id, contact_crypto_id } = result.rows[0];

    // Create the reverse relationship (mutual contact)
    await db.query(
      `
      INSERT INTO contacts (owner_crypto_id, contact_crypto_id, contact_status, accepted_at) 
      VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP)
      ON CONFLICT (owner_crypto_id, contact_crypto_id) 
      DO UPDATE SET contact_status = 'accepted', accepted_at = CURRENT_TIMESTAMP
    `,
      [contact_crypto_id, owner_crypto_id]
    );

    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contact_request_accepted",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      { request_id: requestId }
    );

    res.json({
      success: true,
      message: "Contact request accepted successfully",
      data: { requestId, status: "accepted" },
    });
  } catch (error) {
    console.error("Accept contact request error:", error);
    res.status(500).json({
      error: "ACCEPT_REQUEST_FAILED",
      message: "Failed to accept contact request",
    });
  }
});

// Reject contact request (requires both sessions)
router.post("/:requestId/reject", requireBothSessions, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Delete the contact request
    const result = await db.query(
      `
      DELETE FROM contacts 
      WHERE id = $1 AND contact_crypto_id = $2 AND contact_status = 'pending'
      RETURNING id
    `,
      [requestId, req.cryptoSession.cryptoProfileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "REQUEST_NOT_FOUND",
        message: "Contact request not found or already processed",
      });
    }

    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contact_request_rejected",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      { request_id: requestId }
    );

    res.json({
      success: true,
      message: "Contact request rejected successfully",
      data: { requestId, status: "rejected" },
    });
  } catch (error) {
    console.error("Reject contact request error:", error);
    res.status(500).json({
      error: "REJECT_REQUEST_FAILED",
      message: "Failed to reject contact request",
    });
  }
});

// Get pending contact requests (incoming)
router.get("/requests/pending", requireBothSessions, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM get_pending_contact_requests($1)",
      [req.cryptoSession.cryptoProfileId]
    );

    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "pending_requests_accessed",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      { requests_count: result.rows.length }
    );

    res.json({
      success: true,
      data: {
        pendingRequests: result.rows.map((request) => ({
          requestId: request.contact_id,
          requesterCryptoId: request.requester_crypto_id,
          requesterUsername: request.requester_username,
          message: request.request_message,
          receivedAt: request.added_at,
        })),
        totalRequests: result.rows.length,
      },
    });
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({
      error: "PENDING_REQUESTS_FAILED",
      message: "Failed to retrieve pending contact requests",
    });
  }
});

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

// Get user's contacts list with presence (requires both sessions)
router.get("/", requireBothSessions, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM get_contacts_with_presence($1)",
      [req.cryptoSession.cryptoProfileId]
    );

    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "contacts_accessed",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      { contacts_count: result.rows.length }
    );

    res.json({
      success: true,
      data: {
        contacts: result.rows.map((contact) => ({
          contactId: contact.contact_id,
          contactCryptoId: contact.contact_crypto_id,
          username: contact.username,
          publicKey: contact.public_key,
          alias: contact.contact_alias,
          userDeclaredVerified: contact.user_declared_verified,
          status: contact.contact_status,
          addedAt: contact.added_at,
          acceptedAt: contact.accepted_at,
          lastInteraction: contact.last_interaction,
          presence: {
            status: contact.presence_status,
            lastSeen: contact.last_seen,
            isOnline: contact.is_online,
          },
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

// Check relationship status with another user
router.get("/status/:username", requireBothSessions, async (req, res) => {
  try {
    const { username } = req.params;

    // Find target user's crypto profile
    const userResult = await db.query(
      `
      SELECT cp.id as crypto_profile_id, a.username
      FROM accounts a
      INNER JOIN crypto_profiles cp ON a.id = cp.account_id
      WHERE a.username = $1 AND a.account_status = 'active'
    `,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "User not found or has no crypto profile",
      });
    }

    const targetUser = userResult.rows[0];

    // Get relationship status
    const statusResult = await db.query(
      "SELECT * FROM get_contact_status($1, $2)",
      [req.cryptoSession.cryptoProfileId, targetUser.crypto_profile_id]
    );

    const relationshipStatus = statusResult.rows[0];

    res.json({
      success: true,
      data: {
        username: targetUser.username,
        relationshipStatus: relationshipStatus.relationship_status,
        isMutual: relationshipStatus.is_mutual,
        canMessage: relationshipStatus.is_mutual,
      },
    });
  } catch (error) {
    console.error("Get relationship status error:", error);
    res.status(500).json({
      error: "STATUS_CHECK_FAILED",
      message: "Failed to check relationship status",
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

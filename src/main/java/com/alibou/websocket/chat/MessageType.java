package com.alibou.websocket.chat;

public enum MessageType {

    CHAT,
    JOIN,
    LEAVE,
    IMAGE,
 // 📞 Voice Call Types
    CALL_REQUEST,     // Call start request
    CALL_ACCEPT,      // Call accepted
    CALL_REJECT,      // Call rejected
    CALL_END,         // Call ended
    OFFER,            // WebRTC offer (SDP)
    ANSWER,           // WebRTC answer (SDP)
    ICE_CANDIDATE     // ICE candidate for connection
}
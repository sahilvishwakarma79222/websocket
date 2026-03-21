// com/alibou/websocket/chat/MessageType.java
package com.alibou.websocket.chat;

public enum MessageType {
    CHAT,
    JOIN,
    LEAVE,
    IMAGE,
    USER_LIST,      // 🔥 NEW: Send list of online users
    
    // Voice Call Types
    CALL_REQUEST,
    CALL_ACCEPT,
    CALL_REJECT,
    CALL_END,
    OFFER,
    ANSWER,
    ICE_CANDIDATE
}
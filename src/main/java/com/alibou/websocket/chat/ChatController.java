// com/alibou/websocket/chat/ChatController.java
package com.alibou.websocket.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
@RequiredArgsConstructor
public class ChatController {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    // Track active users
    private static final Set<String> activeUsers = ConcurrentHashMap.newKeySet();
    
    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        return chatMessage;
    }
    
    @MessageMapping("/chat.addUser")
    public void addUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String username = chatMessage.getSender();
        
        // Add to active users
        activeUsers.add(username);
        
        // Store in session
        headerAccessor.getSessionAttributes().put("username", username);
        
        // 1️⃣ Broadcast JOIN message
        ChatMessage joinMessage = ChatMessage.builder()
                .type(MessageType.JOIN)
                .sender(username)
                .build();
        messagingTemplate.convertAndSend("/topic/public", joinMessage);
        
        // 2️⃣ Broadcast CURRENT USER LIST to EVERYONE
        ChatMessage userListMessage = ChatMessage.builder()
                .type(MessageType.USER_LIST)
                .content(String.join(",", activeUsers))
                .sender("system")
                .build();
        messagingTemplate.convertAndSend("/topic/public", userListMessage);
    }
    
    @MessageMapping("/chat.removeUser")
    public void removeUser(@Payload ChatMessage chatMessage) {
        String username = chatMessage.getSender();
        activeUsers.remove(username);
        
        // Broadcast LEAVE message
        ChatMessage leaveMessage = ChatMessage.builder()
                .type(MessageType.LEAVE)
                .sender(username)
                .build();
        messagingTemplate.convertAndSend("/topic/public", leaveMessage);
        
        // Broadcast updated user list
        ChatMessage userListMessage = ChatMessage.builder()
                .type(MessageType.USER_LIST)
                .content(String.join(",", activeUsers))
                .sender("system")
                .build();
        messagingTemplate.convertAndSend("/topic/public", userListMessage);
    }
    
    public Set<String> getActiveUsers() {
        return activeUsers;
    }
}
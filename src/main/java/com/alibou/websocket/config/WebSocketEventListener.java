package com.alibou.websocket.config;

import com.alibou.websocket.chat.ChatMessage;
import com.alibou.websocket.chat.MessageType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messagingTemplate;
    
    // Agar scheduler add kiya hai to ye dependency bhi le sakte ho
    // private final ChatCleanupScheduler cleanupScheduler;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        String sessionId = headerAccessor.getSessionId(); // Session ID bhi le sakte ho
        
        if (username != null) {
            log.info("User disconnected: {}", username);
            
            // Agar session tracking use kar rahe ho to yahan remove karo
            // if (cleanupScheduler != null) {
            //     cleanupScheduler.updateSessionActivity(sessionId); // Negative update?
            // }
            
            var chatMessage = ChatMessage.builder()
                    .type(MessageType.LEAVE)
                    .sender(username)
                    .build();
            messagingTemplate.convertAndSend("/topic/public", chatMessage);
        }
    }
}
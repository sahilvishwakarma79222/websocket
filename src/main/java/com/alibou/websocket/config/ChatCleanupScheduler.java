package com.alibou.websocket.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
@EnableScheduling
@Component
@Slf4j
@RequiredArgsConstructor
public class ChatCleanupScheduler {

    private final SimpMessageSendingOperations messagingTemplate;
    
    // Active sessions track karne ke liye (optional)
    private final Map<String, Long> sessionActivityMap = new ConcurrentHashMap<>();
    
    /**
     * HAR 1 GHANTE MEIN CLEANUP - Ye main cleanup hai
     */
//    @Scheduled(fixedRate = 3600000) // 3600000 ms = 1 hour
    @Scheduled(fixedRate = 60000) // 60000 ms = 1 minute (TESTING)
    public void performHourlyCleanup() {
        log.info("🧹 Hourly cleanup started at: {}", 
            LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_TIME));
        
        // 1. Memory status check karo
        logMemoryStatus();
        
        // 2. Stale sessions cleanup (optional)
        cleanupStaleSessions();
        
        // 3. System GC ko hint do
        System.gc();
        
        log.info("✅ Hourly cleanup completed");
    }
    
    /**
     * HAR 30 MINUTE MEIN LIGHT CLEANUP (optional)
     */
    @Scheduled(fixedRate = 1800000) // 1800000 ms = 30 minutes
    public void performLightCleanup() {
        log.debug("🧹 Light cleanup running...");
        
        // Sirf memory status check
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        
        if (usedMemory > 200) { // Agar 200 MB se zyada ho
            log.warn("⚠️ High memory usage detected: {} MB. Forcing cleanup...", usedMemory);
            System.gc();
        }
    }
    
    /**
     * MEMORY STATUS LOG KARO
     */
    private void logMemoryStatus() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory() / (1024 * 1024);
        long freeMemory = runtime.freeMemory() / (1024 * 1024);
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory() / (1024 * 1024);
        
        log.info("📊 Memory Status:");
        log.info("   - Used: {} MB", usedMemory);
        log.info("   - Free: {} MB", freeMemory);
        log.info("   - Total: {} MB", totalMemory);
        log.info("   - Max: {} MB", maxMemory);
        
        // Agar memory 80% se upar ho to warning do
        if (usedMemory > (maxMemory * 0.8)) {
            log.warn("⚠️ Critical memory usage! Consider restarting if performance degrades.");
        }
    }
    
    /**
     * STALE SESSIONS CLEANUP (Agar chahte ho to)
     * Yeh track karega ki kaun si sessions inactive hain
     */
    private void cleanupStaleSessions() {
        // Yeh method optional hai - agar active sessions track kar rahe ho to
        long now = System.currentTimeMillis();
        long timeout = 30 * 60 * 1000; // 30 minutes
        
        sessionActivityMap.entrySet().removeIf(entry -> {
            String sessionId = entry.getKey();
            long lastActivity = entry.getValue();
            
            if (now - lastActivity > timeout) {
                log.info("🧹 Removing stale session: {}", sessionId);
                return true;
            }
            return false;
        });
    }
    
    /**
     * SESSION ACTIVITY UPDATE KARNE KE LIYE METHOD
     * (Call this from your controller when message arrives)
     */
    public void updateSessionActivity(String sessionId) {
        sessionActivityMap.put(sessionId, System.currentTimeMillis());
    }
}
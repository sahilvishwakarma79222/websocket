package com.alibou.websocket.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class ChatCleanupScheduler {

    // Har 5 ghante (18,000,000 ms) mein app ko shut down karega
    // Render ise detect karke naya container start kar dega
	// initialDelay = 18000000 (5 ghante baad pehla run hoga)
	// fixedRate = 18000000 (uske baad har 5 ghante mein run hoga)
	@Scheduled(initialDelay = 18000000, fixedRate = 18000000) 
	public void scheduledHardRestart() {
	    log.warn("🚨 5 Hours Completed! Restarting application to refresh resources...");
	    System.exit(0);
	}
}
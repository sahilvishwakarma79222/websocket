package com.alibou.websocket.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class ChatCleanupScheduler {

	@Scheduled(initialDelay = 18000000, fixedRate = 18000000) 
	public void scheduledHardRestart() {
	    log.warn("🚨 5 Hours Completed! Restarting application to refresh resources...");
	    System.exit(0);
	}
}
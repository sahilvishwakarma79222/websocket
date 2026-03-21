// com/alibou/websocket/note/NoteController.java
package com.alibou.websocket.note;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {
    
    private static final String NOTE_FILE = "chat_note.txt";
    private static final String NOTE_INFO_FILE = "chat_note_info.txt";
    
    // Read note
    @GetMapping
    public ResponseEntity<Map<String, Object>> getNote() {
        try {
            Path filePath = Paths.get(NOTE_FILE);
            Path infoPath = Paths.get(NOTE_INFO_FILE);
            
            // Create default note if not exists
            if (!Files.exists(filePath)) {
                Files.writeString(filePath, "✨ Welcome to JyoSah Chat! ✨\n📌 Type your note here...");
                String defaultInfo = "lastUpdated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")) + "\n" +
                                     "lastUpdatedBy: system";
                Files.writeString(infoPath, defaultInfo);
            }
            
            String content = Files.readString(filePath);
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", content);
            
            // Read metadata if exists
            if (Files.exists(infoPath)) {
                String info = Files.readString(infoPath);
                String[] lines = info.split("\n");
                for (String line : lines) {
                    if (line.startsWith("lastUpdated:")) {
                        response.put("lastUpdated", line.substring("lastUpdated:".length()).trim());
                    } else if (line.startsWith("lastUpdatedBy:")) {
                        response.put("lastUpdatedBy", line.substring("lastUpdatedBy:".length()).trim());
                    }
                }
            } else {
                response.put("lastUpdated", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
                response.put("lastUpdatedBy", "system");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to read note");
            error.put("content", "✨ Welcome to JyoSah Chat! ✨");
            return ResponseEntity.ok(error);
        }
    }
    
    // Update note
    @PostMapping
    public ResponseEntity<Map<String, Object>> updateNote(@RequestBody Map<String, String> request) {
        String newContent = request.get("content");
        String username = request.get("username");
        
        // Validation
        if (newContent == null || newContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Note cannot be empty!"
            ));
        }
        
        if (newContent.length() > 1000) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Note too long! Maximum 1000 characters."
            ));
        }
        
        try {
            // Write note content
            Path filePath = Paths.get(NOTE_FILE);
            Files.writeString(filePath, newContent.trim());
            
            // Write metadata with formatted time
            LocalDateTime now = LocalDateTime.now();
            String formattedTime = now.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
            String info = "lastUpdated: " + formattedTime + "\n" +
                         "lastUpdatedBy: " + (username != null ? username : "Anonymous");
            Path infoPath = Paths.get(NOTE_INFO_FILE);
            Files.writeString(infoPath, info);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Note updated successfully!",
                "content", newContent,
                "lastUpdated", formattedTime,
                "lastUpdatedBy", username != null ? username : "Anonymous"
            ));
            
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to save note. Please try again."
            ));
        }
    }
}
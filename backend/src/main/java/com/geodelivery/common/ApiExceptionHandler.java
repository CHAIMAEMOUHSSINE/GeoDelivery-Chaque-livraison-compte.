package com.geodelivery.common;

import java.util.Map;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    ResponseEntity<?> business(BusinessException e) { return ResponseEntity.status(e.status()).body(Map.of("message", e.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Données invalides", "errors",
            e.getBindingResult().getFieldErrors().stream().map(x -> x.getField() + " : " + x.getDefaultMessage()).toList()));
    }
    @ExceptionHandler({IllegalArgumentException.class, HandlerMethodValidationException.class,
        HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "Paramètres ou coordonnées invalides")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> integrity() { return ResponseEntity.status(409).body(Map.of("message", "Conflit : référence, affectation ou relation déjà utilisée")); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> denied() { return ResponseEntity.status(403).body(Map.of("message", "Accès interdit")); }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> database(DataAccessException e) {
        LoggerFactory.getLogger(getClass()).error("Erreur Oracle ({})", e.getClass().getSimpleName());
        return ResponseEntity.status(503).body(Map.of("message", "Base Oracle indisponible ou schéma non installé"));
    }
}

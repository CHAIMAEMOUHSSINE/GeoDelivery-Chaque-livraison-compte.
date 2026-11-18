package com.geodelivery.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service=service; }
    public record LoginRequest(@NotBlank @Email String email,@NotBlank @Size(max=100) String password) {}
    @PostMapping("/login")
    public Map<String,Object> login(@Valid @RequestBody LoginRequest r) { return service.login(r.email(),r.password()); }
}

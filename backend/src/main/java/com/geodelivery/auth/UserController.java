package com.geodelivery.auth;

import java.util.Map;
import java.util.Locale;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserRepository users; private final BCryptPasswordEncoder passwords;
    public UserController(UserRepository users,BCryptPasswordEncoder passwords) { this.users=users; this.passwords=passwords; }
    public record CreateUser(@NotBlank @Email @Size(max=180) String email,
        @NotBlank @Size(min=12,max=72) String password,@NotBlank @Pattern(regexp="ADMIN|DISPATCHER|DRIVER") String role) {}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> create(@Valid @RequestBody CreateUser r) {
        var u=users.saveAndFlush(new AppUser(r.email().toLowerCase(Locale.ROOT),passwords.encode(r.password()),r.role()));
        return Map.of("id",u.id,"email",u.email,"role",u.role);
    }
}

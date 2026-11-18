package com.geodelivery.auth;

import java.time.Instant;
import java.util.Map;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.stereotype.Service;
import com.geodelivery.common.BusinessException;

@Service
public class AuthService implements ApplicationRunner {
    private final UserRepository users;
    private final BCryptPasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final String adminEmail,adminPassword;
    private final String dummyHash;
    public AuthService(UserRepository users,BCryptPasswordEncoder passwords,JwtEncoder encoder,
        @Value("${app.admin-email}") String email,@Value("${app.admin-password}") String password) {
        this.users=users; this.passwords=passwords; this.encoder=encoder;
        adminEmail=email.toLowerCase(Locale.ROOT); adminPassword=password;
        dummyHash=passwords.encode("non-existent-user");
    }
    @Override public void run(ApplicationArguments args) {
        if (!adminPassword.isBlank() && users.findByEmail(adminEmail).isEmpty()) {
            if (adminPassword.length()<12) throw new IllegalStateException("Mot de passe administrateur : 12 caractères minimum");
            users.save(new AppUser(adminEmail,passwords.encode(adminPassword),"ADMIN"));
        }
    }
    public Map<String,Object> login(String email,String password) {
        var user=users.findByEmail(email.toLowerCase(Locale.ROOT));
        boolean matches=passwords.matches(password,user.map(u -> u.passwordHash).orElse(dummyHash));
        if (user.isEmpty() || !matches) throw new BusinessException(HttpStatus.UNAUTHORIZED,"Identifiants incorrects");
        var u=user.get(); var now=Instant.now();
        var claims=JwtClaimsSet.builder().issuer("geodelivery").subject(u.id.toString()).issuedAt(now)
            .expiresAt(now.plusSeconds(3600)).claim("email",u.email).claim("role",u.role).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return Map.of("token",token,"role",u.role,"email",u.email,"expiresIn",3600);
    }
}

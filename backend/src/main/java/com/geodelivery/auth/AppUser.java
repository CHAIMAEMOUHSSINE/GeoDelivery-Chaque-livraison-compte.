package com.geodelivery.auth;

import jakarta.persistence.*;

@Entity
@Table(name="APP_USER")
public class AppUser {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false,unique=true) public String email;
    @Column(name="password_hash",nullable=false) public String passwordHash;
    @Column(nullable=false) public String role;
    protected AppUser() {}
    public AppUser(String email,String passwordHash,String role) {
        this.email=email; this.passwordHash=passwordHash; this.role=role;
    }
}

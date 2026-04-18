package com.taskforce.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.util.Base64;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    // Supabase ES256 JWK — P-256 public key coordinates (base64url).
    // Source: GET /auth/v1/.well-known/jwks.json — update here if the project key is rotated.
    @Value("${app.supabase.jwk-x:ZaPa1kVwVMF4yfx0JWS5m7d-r-kq1l2UHvOj93QQYU4}")
    private String jwkX;

    @Value("${app.supabase.jwk-y:yNsjJ8f1JhK_5jnDM7lUbXvZgCYwHVV4nUmyBOi_8mQ}")
    private String jwkY;

    private Algorithm es256Algorithm;

    @PostConstruct
    public void init() {
        try {
            AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
            params.init(new ECGenParameterSpec("secp256r1")); // P-256
            ECParameterSpec ecParams = params.getParameterSpec(ECParameterSpec.class);

            byte[] x = Base64.getUrlDecoder().decode(padBase64(jwkX));
            byte[] y = Base64.getUrlDecoder().decode(padBase64(jwkY));
            ECPoint point = new ECPoint(new BigInteger(1, x), new BigInteger(1, y));
            ECPublicKeySpec keySpec = new ECPublicKeySpec(point, ecParams);
            ECPublicKey ecPublicKey = (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(keySpec);
            es256Algorithm = Algorithm.ECDSA256(ecPublicKey, null);
        } catch (Exception e) {
            // Log but don't crash — ES256 tokens will just fail to verify
            logger.warn("Failed to build ES256 verifier from JWK: " + e.getMessage());
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        // No token — pass through; SecurityConfig decides if the route needs auth
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            Algorithm algorithm = detectAlgorithm(token);
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT jwt = verifier.verify(token);

            // sub claim = Supabase user UUID
            String userId = jwt.getSubject();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

            chain.doFilter(request, response);

        } catch (JWTVerificationException e) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Invalid or expired token\"}");
        }
    }

    private Algorithm detectAlgorithm(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 1) {
                String header = new String(Base64.getUrlDecoder().decode(padBase64(parts[0])));
                if (header.contains("\"ES256\"") && es256Algorithm != null) {
                    return es256Algorithm;
                }
            }
        } catch (Exception ignored) {
            // fall through to HS256
        }
        return Algorithm.HMAC256(jwtSecret);
    }

    private static String padBase64(String s) {
        return switch (s.length() % 4) {
            case 2 -> s + "==";
            case 3 -> s + "=";
            default -> s;
        };
    }
}

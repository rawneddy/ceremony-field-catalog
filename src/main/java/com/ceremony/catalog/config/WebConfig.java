package com.ceremony.catalog.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;
import java.util.Objects;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final String[] DEFAULT_ORIGINS = {"http://localhost:5173", "http://localhost:3000"};

    @Value("${catalog.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String[] allowedOrigins = DEFAULT_ORIGINS;

    @Override
    public void addArgumentResolvers(@NonNull List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new DynamicSearchParameterResolver());
    }

    @Override
    @SuppressWarnings("null") // Objects.requireNonNullElse guarantees non-null
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/catalog/**")
            .allowedOrigins(Objects.requireNonNullElse(allowedOrigins, DEFAULT_ORIGINS))
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
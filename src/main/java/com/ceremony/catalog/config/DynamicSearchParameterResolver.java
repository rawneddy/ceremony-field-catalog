package com.ceremony.catalog.config;

import com.ceremony.catalog.api.dto.CatalogSearchRequest;
import org.springframework.core.MethodParameter;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

public class DynamicSearchParameterResolver implements HandlerMethodArgumentResolver {

    private static final Set<String> KNOWN_PARAMETERS = Set.of(
        "contextId", "fieldPathContains", "page", "size"
    );

    @Override
    public boolean supportsParameter(@NonNull MethodParameter parameter) {
        return parameter.getParameterType().equals(CatalogSearchRequest.class);
    }

    @Override
    public Object resolveArgument(@NonNull MethodParameter parameter, @Nullable ModelAndViewContainer mavContainer,
                                @NonNull NativeWebRequest webRequest, @Nullable WebDataBinderFactory binderFactory) {
        
        Map<String, String> metadata = new HashMap<>();
        
        // Extract known parameters
        String contextId = webRequest.getParameter("contextId");
        contextId = (contextId != null && !contextId.trim().isEmpty()) ? contextId : null;
        
        String fieldPathContains = webRequest.getParameter("fieldPathContains");
        fieldPathContains = (fieldPathContains != null && !fieldPathContains.trim().isEmpty()) ? fieldPathContains : null;
        
        // Parse page parameter
        int page = 0;
        String pageParam = webRequest.getParameter("page");
        if (pageParam != null && !pageParam.trim().isEmpty()) {
            try {
                page = Integer.parseInt(pageParam);
            } catch (NumberFormatException e) {
                page = 0;
            }
        }
        
        // Parse size parameter
        int size = 50;
        String sizeParam = webRequest.getParameter("size");
        if (sizeParam != null && !sizeParam.trim().isEmpty()) {
            try {
                size = Integer.parseInt(sizeParam);
            } catch (NumberFormatException e) {
                size = 50;
            }
        }
        
        // Handle any other parameters as metadata
        Iterator<String> paramNames = webRequest.getParameterNames();
        while (paramNames.hasNext()) {
            String paramName = paramNames.next();
            if (paramName != null && !KNOWN_PARAMETERS.contains(paramName)) {
                String value = webRequest.getParameter(paramName);
                if (value != null && !value.trim().isEmpty()) {
                    // Normalize metadata keys and values to lowercase for case-insensitive handling
                    metadata.put(paramName.toLowerCase(), value.toLowerCase());
                }
            }
        }
        
        // Create and return the immutable Record
        return new CatalogSearchRequest(contextId, fieldPathContains, page, size, metadata);
    }
}
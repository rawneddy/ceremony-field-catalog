package com.ceremony.catalog.config;

import com.ceremony.catalog.api.dto.CatalogSearchRequest;
import org.springframework.core.MethodParameter;
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
        "contextId", "xpathContains", "page", "size"
    );

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType().equals(CatalogSearchRequest.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        
        CatalogSearchRequest request = new CatalogSearchRequest();
        Map<String, String> metadata = new HashMap<>();
        
        // Handle known parameters
        String contextId = webRequest.getParameter("contextId");
        if (contextId != null && !contextId.trim().isEmpty()) {
            request.setContextId(contextId);
        }
        
        String xpathContains = webRequest.getParameter("xpathContains");
        if (xpathContains != null && !xpathContains.trim().isEmpty()) {
            request.setXpathContains(xpathContains);
        }
        
        String page = webRequest.getParameter("page");
        if (page != null && !page.trim().isEmpty()) {
            try {
                request.setPage(Integer.parseInt(page));
            } catch (NumberFormatException e) {
                request.setPage(0);
            }
        }
        
        String size = webRequest.getParameter("size");
        if (size != null && !size.trim().isEmpty()) {
            try {
                request.setSize(Integer.parseInt(size));
            } catch (NumberFormatException e) {
                request.setSize(50);
            }
        }
        
        // Handle any other parameters as metadata
        Iterator<String> paramNames = webRequest.getParameterNames();
        while (paramNames.hasNext()) {
            String paramName = paramNames.next();
            if (!KNOWN_PARAMETERS.contains(paramName)) {
                String value = webRequest.getParameter(paramName);
                if (value != null && !value.trim().isEmpty()) {
                    metadata.put(paramName, value);
                }
            }
        }
        
        request.setMetadata(metadata);
        return request;
    }
}
package com.ceremony.catalog.config;

import com.ceremony.catalog.api.dto.CatalogSearchRequest;
import org.springframework.core.MethodParameter;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class DynamicSearchParameterResolver implements HandlerMethodArgumentResolver {

    private static final Set<String> KNOWN_PARAMETERS = Set.of(
        "q", "contextId", "fieldPathContains", "useRegex", "page", "size"
    );

    @Override
    public boolean supportsParameter(@NonNull MethodParameter parameter) {
        return parameter.getParameterType().equals(CatalogSearchRequest.class);
    }

    @Override
    public Object resolveArgument(@NonNull MethodParameter parameter, @Nullable ModelAndViewContainer mavContainer,
                                @NonNull NativeWebRequest webRequest, @Nullable WebDataBinderFactory binderFactory) {

        Map<String, List<String>> metadata = new HashMap<>();

        // Extract global search parameter (q)
        String q = webRequest.getParameter("q");
        q = (q != null && !q.trim().isEmpty()) ? q : null;

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

        // Parse useRegex parameter (defaults to false)
        boolean useRegex = false;
        String useRegexParam = webRequest.getParameter("useRegex");
        if (useRegexParam != null && !useRegexParam.trim().isEmpty()) {
            useRegex = Boolean.parseBoolean(useRegexParam);
        }

        // Handle any other parameters as metadata (strip metadata. prefix if present)
        // Uses getParameterValues() to support multiple values per key (OR logic)
        Iterator<String> paramNames = webRequest.getParameterNames();
        while (paramNames.hasNext()) {
            String paramName = paramNames.next();
            if (paramName != null && !KNOWN_PARAMETERS.contains(paramName)) {
                String[] values = webRequest.getParameterValues(paramName);
                if (values != null && values.length > 0) {
                    // Strip metadata. prefix if present (frontend sends metadata.productCode=value)
                    String key = paramName.startsWith("metadata.")
                        ? paramName.substring("metadata.".length())
                        : paramName;
                    // Normalize metadata keys and values to lowercase for case-insensitive handling
                    List<String> normalizedValues = Arrays.stream(values)
                        .filter(v -> v != null && !v.trim().isEmpty())
                        .map(String::toLowerCase)
                        .collect(Collectors.toList());
                    if (!normalizedValues.isEmpty()) {
                        metadata.put(key.toLowerCase(), normalizedValues);
                    }
                }
            }
        }

        // Create and return the immutable Record
        return new CatalogSearchRequest(q, contextId, fieldPathContains, useRegex, page, size, metadata);
    }
}
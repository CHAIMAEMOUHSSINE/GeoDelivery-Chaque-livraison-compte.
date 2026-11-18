package com.geodelivery.common;

import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class Db {
    private final NamedParameterJdbcTemplate jdbc;
    public Db(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Map<String,Object>> list(String sql, Map<String,?> params) {
        return jdbc.query(sql, params, (rs, row) -> {
            Map<String,Object> result = new LinkedHashMap<>();
            var meta = rs.getMetaData();
            for (int i=1; i<=meta.getColumnCount(); i++) {
                String[] parts = meta.getColumnLabel(i).toLowerCase(Locale.ROOT).split("_");
                StringBuilder key = new StringBuilder(parts[0]);
                for (int j=1; j<parts.length; j++) key.append(Character.toUpperCase(parts[j].charAt(0))).append(parts[j].substring(1));
                Object value = switch(meta.getColumnType(i)) {
                    case java.sql.Types.TIMESTAMP -> {
                        var timestamp=rs.getTimestamp(i);
                        yield timestamp==null?null:timestamp.toLocalDateTime();
                    }
                    case java.sql.Types.DATE -> {
                        var date=rs.getDate(i);
                        yield date==null?null:date.toLocalDate();
                    }
                    default -> rs.getObject(i);
                };
                result.put(key.toString(), value);
            }
            return result;
        });
    }
    public Map<String,Object> one(String sql, Map<String,?> params) {
        var rows = list(sql, params);
        if (rows.isEmpty()) throw BusinessException.missing("Ressource introuvable");
        return rows.getFirst();
    }
    public int update(String sql, Map<String,?> params) { return jdbc.update(sql, params); }
    public long insert(String sql, Map<String,?> params) {
        var key = new org.springframework.jdbc.support.GeneratedKeyHolder();
        jdbc.update(sql, new org.springframework.jdbc.core.namedparam.MapSqlParameterSource(params), key, new String[]{"ID"});
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public static long id(Map<String,Object> row, String key) { return ((Number)row.get(key)).longValue(); }
    public static double number(Map<String,Object> row, String key) { return ((Number)row.get(key)).doubleValue(); }
}

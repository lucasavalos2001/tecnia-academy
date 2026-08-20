# Backups automáticos de la base de datos

## Cómo se configura (una sola vez, en el servidor)

1. Dar permiso de ejecución al script:
   ```
   chmod +x /var/www/tecnia-academy/backend/scripts/backup_db.sh
   ```

2. Probarlo manualmente una vez:
   ```
   /var/www/tecnia-academy/backend/scripts/backup_db.sh
   ```
   Si funciona, va a crear un archivo en `/var/backups/tecnia-academy/`.

3. Programarlo para que corra solo todos los días a las 3 AM:
   ```
   crontab -e
   ```
   Y agregar esta línea al final del archivo:
   ```
   0 3 * * * /var/www/tecnia-academy/backend/scripts/backup_db.sh
   ```

Con esto, todos los días a las 3 AM se genera un backup comprimido, y se borran automáticamente los que tengan más de 14 días (para no llenar el disco del servidor).

## Cómo restaurar un backup si algo sale mal

```
gunzip -c /var/backups/tecnia-academy/tecnia_academy_FECHA.sql.gz | PGPASSWORD=tu_password psql -h localhost -U postgres -d tecnia_academy
```

Reemplazando `FECHA` por el archivo que quieras restaurar, y los datos de conexión por los que estén en el `.env` del servidor.

**Importante:** esto es un backup local (guardado en el mismo servidor). Protege contra errores de datos, borrados accidentales o corrupción — pero no contra una falla total del servidor (robo, disco roto, etc). Si más adelante querés protección contra eso también, se puede agregar una copia extra fuera del servidor (por ejemplo DigitalOcean Spaces).

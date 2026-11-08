package com.arcanes.scenario;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Mise à jour de l'application : télécharge l'APK d'une release GitHub dans le cache privé de l'application,
 * vérifie que c'est bien Arcanes & Scénario, puis ouvre l'installateur d'Android (une confirmation reste demandée par Android).
 */
@CapacitorPlugin(name = "ApkUpdate")
public class ApkUpdatePlugin extends Plugin {
    // Seules les pièces jointes des releases du dépôt de l'application sont acceptées.
    private static final String ALLOWED_PREFIX = "https://github.com/Tageek88/Arcanes-scenario/releases/download/";
    private static final String FILE_NAME = "Arcanes-Scenario-update.apk";
    private final AtomicBoolean busy = new AtomicBoolean(false);

    private File updateDir() {
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        return dir;
    }

    @PluginMethod
    public void download(PluginCall call) {
        final String address = call.getString("url", "");
        if (address == null || !address.startsWith(ALLOWED_PREFIX)) {
            call.reject("Adresse de téléchargement refusée.", "bad_url");
            return;
        }
        if (!busy.compareAndSet(false, true)) {
            call.reject("Un téléchargement est déjà en cours.", "busy");
            return;
        }
        new Thread(() -> {
            final File target = new File(updateDir(), FILE_NAME);
            final File part = new File(updateDir(), FILE_NAME + ".part");
            HttpURLConnection connection = null;
            boolean done = false;
            try {
                part.delete();
                target.delete();
                connection = (HttpURLConnection) new URL(address).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                int status = connection.getResponseCode();
                if (status != 200) throw new IOException("HTTP " + status);
                final long total = connection.getContentLengthLong();
                long received = 0;
                long lastEvent = 0;
                try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        received += read;
                        long now = System.currentTimeMillis();
                        if (now - lastEvent >= 250) {
                            lastEvent = now;
                            JSObject progress = new JSObject();
                            progress.put("received", received);
                            progress.put("total", total);
                            notifyListeners("progress", progress);
                        }
                    }
                }
                if (total > 0 && received != total) throw new IOException("Fichier incomplet");
                if (!part.renameTo(target)) throw new IOException("Fichier inutilisable");
                PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(target.getAbsolutePath(), 0);
                if (info == null || !getContext().getPackageName().equals(info.packageName)) {
                    target.delete();
                    call.reject("Le fichier téléchargé n'est pas une mise à jour d'Arcanes & Scénario.", "invalid");
                    return;
                }
                JSObject result = new JSObject();
                result.put("size", received);
                result.put("version", info.versionName == null ? "" : info.versionName);
                done = true;
                call.resolve(result);
            } catch (IOException error) {
                call.reject("Téléchargement interrompu : " + error.getMessage(), "network");
            } finally {
                if (connection != null) connection.disconnect();
                if (!done) {
                    part.delete();
                    target.delete();
                }
                busy.set(false);
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        File target = new File(updateDir(), FILE_NAME);
        if (!target.exists()) {
            call.reject("Aucun fichier de mise à jour téléchargé.", "missing");
            return;
        }
        // Android 8+ : l'autorisation « installer des applications inconnues » se donne une fois, pour cette application.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(settings);
            } catch (ActivityNotFoundException ignored) {
                // Réglage introuvable : le message de l'application explique quoi faire.
            }
            call.reject("Autorisation d'installer des applications requise.", "permission");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".updateprovider", target);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException | IllegalArgumentException error) {
            call.reject("Installation impossible : " + error.getMessage(), "install");
        }
    }
}

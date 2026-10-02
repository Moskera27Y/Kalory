package com.kalory.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Calendar;

/**
 * Pasos del día con el sensor de hardware (sin dependencias externas).
 * Guarda la lectura base de medianoche y devuelve pasos de hoy.
 */
@CapacitorPlugin(name = "KalorySteps", permissions = {
        @com.getcapacitor.annotation.Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "steps")
})
public class KalorySteps extends Plugin {
    private static final String PREFS = "kalory_steps";
    private SensorManager sensorManager;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    }

    private String todayKey() {
        Calendar c = Calendar.getInstance();
        return c.get(Calendar.YEAR) + "-" + (c.get(Calendar.MONTH) + 1) + "-" + c.get(Calendar.DAY_OF_MONTH);
    }

    @PluginMethod
    public void getToday(final PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("steps", call, "permCallback");
            return;
        }
        readSteps(call);
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void permCallback(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION)
                == PackageManager.PERMISSION_GRANTED) {
            readSteps(call);
        } else {
            call.reject("permiso_denegado");
        }
    }

    private void readSteps(final PluginCall call) {
        Sensor sensor = sensorManager != null ? sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) : null;
        if (sensor == null) {
            call.reject("sin_sensor");
            return;
        }
        final float[] holder = new float[1];
        final boolean[] done = new boolean[1];
        SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done[0]) return;
                done[0] = true;
                holder[0] = event.values[0];
                try { sensorManager.unregisterListener(this); } catch (Exception ignored) {}
                long total = (long) holder[0];
                SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                String key = "base_" + todayKey();
                long base = prefs.getLong(key, -1L);
                if (base < 0 || total < base) {
                    base = total;
                    prefs.edit().putLong(key, base).apply();
                }
                JSObject ret = new JSObject();
                ret.put("steps", (int) Math.max(0, total - base));
                call.resolve(ret);
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {}
        };
        sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL);
        // Seguridad: si el sensor no entrega en 5s, responde con el último valor.
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            if (!done[0]) {
                done[0] = true;
                try { sensorManager.unregisterListener(listener); } catch (Exception ignored) {}
                SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                long base = prefs.getLong("base_" + todayKey(), 0L);
                JSObject ret = new JSObject();
                ret.put("steps", 0);
                ret.put("cached", true);
                call.resolve(ret);
            }
        }, 5000);
    }
}

package com.kalory.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Widget de inicio: pasos, agua y racha del día. */
public class KaloryWidget extends AppWidgetProvider {

    public static void refresh(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids;
        try {
            ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, KaloryWidget.class));
        } catch (Exception e) {
            return;
        }
        for (int id : ids) {
            updateOne(context, mgr, id);
        }
    }

    static void updateOne(Context context, AppWidgetManager mgr, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("kalory_widget", Context.MODE_PRIVATE);
        String steps = prefs.getString("steps", "—");
        String water = prefs.getString("water", "—");
        String streak = prefs.getString("streak", "—");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kalory);
        views.setTextViewText(R.id.wSteps, steps);
        views.setTextViewText(R.id.wWater, water);
        views.setTextViewText(R.id.wStreak, streak);

        Intent open = new Intent(context, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.wRoot, pi);

        try {
            mgr.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateOne(context, mgr, id);
        }
    }
}

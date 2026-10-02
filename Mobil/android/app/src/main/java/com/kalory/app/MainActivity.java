package com.kalory.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(KalorySteps.class);
        super.onCreate(savedInstanceState);
    }
}

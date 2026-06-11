package com.pospro.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.pospro.mobile.plugins.BluetoothPrinterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void load() {
        registerPlugin(BluetoothPrinterPlugin.class);
        super.load();
    }
}


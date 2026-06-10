package com.pospro.mobile.plugins;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "BluetoothPrinter")
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinter";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");

    private BluetoothSocket socket;
    private OutputStream outputStream;
    private String connectedDeviceName;

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("Perangkat tidak mendukung Bluetooth.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("Bluetooth belum diaktifkan.");
                return;
            }

            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            JSArray result = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject obj = new JSObject();
                    obj.put("name", device.getName() != null ? device.getName() : "Tanpa Nama");
                    obj.put("address", device.getAddress());
                    result.put(obj);
                }
            }

            JSObject ret = new JSObject();
            ret.put("devices", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Gagal mengambil daftar perangkat: " + e.getMessage(), e);
            call.reject("Gagal mengambil daftar perangkat: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Alamat Bluetooth tidak valid.");
            return;
        }

        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("Perangkat tidak mendukung Bluetooth.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("Bluetooth belum diaktifkan.");
                return;
            }

            BluetoothDevice device = adapter.getRemoteDevice(address);
            if (device == null) {
                call.reject("Perangkat Bluetooth tidak ditemukan.");
                return;
            }

            disconnectInternal();

            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            adapter.cancelDiscovery();
            socket.connect();
            outputStream = socket.getOutputStream();
            connectedDeviceName = device.getName();

            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("deviceName", device.getName());
            call.resolve(ret);
        } catch (IOException e) {
            Log.e(TAG, "Gagal koneksi Bluetooth: " + e.getMessage(), e);
            disconnectInternal();
            call.reject("Gagal koneksi ke printer: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Error Bluetooth: " + e.getMessage(), e);
            disconnectInternal();
            call.reject("Error Bluetooth: " + e.getMessage());
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("Data cetak tidak boleh kosong.");
            return;
        }

        if (outputStream == null) {
            call.reject("Printer Bluetooth belum terhubung.");
            return;
        }

        try {
            byte[] initCmd = new byte[]{0x1B, 0x40};
            byte[] cutCmd = new byte[]{0x1D, 0x56, 0x41, 0x00};
            byte[] lf = new byte[]{0x0A, 0x0A, 0x0A};
            byte[] dataBytes = data.getBytes("ISO-8859-1");

            outputStream.write(initCmd);
            outputStream.write(dataBytes);
            outputStream.write(lf);
            try {
                outputStream.write(cutCmd);
            } catch (Exception ignored) {
            }
            outputStream.flush();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (IOException e) {
            Log.e(TAG, "Gagal cetak: " + e.getMessage(), e);
            disconnectInternal();
            call.reject("Gagal cetak: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printRaw(PluginCall call) {
        JSArray dataArray = call.getArray("data");
        if (dataArray == null || dataArray.length() == 0) {
            call.reject("Data cetak tidak boleh kosong.");
            return;
        }

        if (outputStream == null) {
            call.reject("Printer Bluetooth belum terhubung.");
            return;
        }

        try {
            byte[] buffer = new byte[dataArray.length()];
            for (int i = 0; i < dataArray.length(); i++) {
                buffer[i] = (byte) dataArray.getInt(i);
            }
            outputStream.write(buffer);
            outputStream.flush();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (IOException e) {
            Log.e(TAG, "Gagal cetak raw: " + e.getMessage(), e);
            disconnectInternal();
            call.reject("Gagal cetak: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        JSObject ret = new JSObject();
        ret.put("disconnected", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", outputStream != null && socket != null && socket.isConnected());
        ret.put("deviceName", connectedDeviceName != null ? connectedDeviceName : "");
        call.resolve(ret);
    }

    private void disconnectInternal() {
        try {
            if (outputStream != null) {
                outputStream.close();
            }
        } catch (Exception ignored) {
        }
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (Exception ignored) {
        }
        outputStream = null;
        socket = null;
        connectedDeviceName = null;
    }
}

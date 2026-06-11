package com.pospro.mobile.plugins;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import org.json.JSONException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(alias = "btConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "btScan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinter";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");

    private BluetoothSocket socket;
    private OutputStream outputStream;
    private String connectedDeviceName;
    private String connectedDeviceAddress;

    private final List<JSObject> discoveredDevices = new ArrayList<>();
    private BroadcastReceiver discoveryReceiver;
    private boolean isDiscovering = false;

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        boolean forDiscovery = call.getBoolean("forDiscovery", true);
        if (hasBluetoothPermissions(forDiscovery)) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAliases(getRequiredPermissionAliases(forDiscovery), call, "permissionRequestCallback");
    }

    @PermissionCallback
    private void permissionRequestCallback(PluginCall call) {
        if (call == null) return;
        boolean forDiscovery = "startDiscovery".equals(call.getMethodName()) || call.getBoolean("forDiscovery", true);
        boolean granted = hasBluetoothPermissions(forDiscovery);
        if (granted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            call.reject("Izin Bluetooth dan lokasi diperlukan untuk menemukan perangkat. Aktifkan dari pengaturan aplikasi.");
        }
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (!ensureBluetoothPermissions(call, false)) {
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

            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            JSArray result = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject obj = new JSObject();
                    obj.put("name", device.getName() != null ? device.getName() : "Tanpa Nama");
                    obj.put("address", device.getAddress());
                    obj.put("paired", true);
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
    public void startDiscovery(PluginCall call) {
        if (!ensureBluetoothPermissions(call, true)) {
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

            discoveredDevices.clear();

            // Add already paired devices first
            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject obj = new JSObject();
                    obj.put("name", device.getName() != null ? device.getName() : "Tanpa Nama");
                    obj.put("address", device.getAddress());
                    obj.put("paired", true);
                    discoveredDevices.add(obj);
                }
            }

            // Unregister previous receiver if any
            unregisterDiscoveryReceiver();

            discoveryReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (device != null) {
                            addDiscoveredDevice(device);
                        }
                    } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                        isDiscovering = false;
                        Log.d(TAG, "Discovery selesai. Ditemukan " + discoveredDevices.size() + " perangkat.");
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_FOUND);
            filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getActivity().registerReceiver(discoveryReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getActivity().registerReceiver(discoveryReceiver, filter);
            }

            adapter.cancelDiscovery();
            adapter.startDiscovery();
            isDiscovering = true;

            JSObject ret = new JSObject();
            ret.put("started", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Gagal memulai discovery: " + e.getMessage(), e);
            call.reject("Gagal memulai discovery: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (!ensureBluetoothPermissions(call, true)) {
            return;
        }
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter != null) {
                adapter.cancelDiscovery();
            }
            unregisterDiscoveryReceiver();
            isDiscovering = false;

            JSObject ret = new JSObject();
            ret.put("stopped", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Gagal menghentikan discovery: " + e.getMessage(), e);
            call.reject("Gagal menghentikan discovery: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDiscoveredDevices(PluginCall call) {
        JSArray result = new JSArray();
        for (JSObject device : discoveredDevices) {
            result.put(device);
        }
        JSObject ret = new JSObject();
        ret.put("devices", result);
        ret.put("isDiscovering", isDiscovering);
        call.resolve(ret);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!ensureBluetoothPermissions(call, false)) {
            return;
        }
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
            adapter.cancelDiscovery();

            boolean connected = false;
            Exception lastException = null;

            // Metode 1: Standard Secure RFCOMM Socket
            try {
                Log.i(TAG, "Mencoba koneksi Metode 1 (Standard Secure RFCOMM)...");
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                connected = true;
                Log.i(TAG, "Koneksi Metode 1 berhasil.");
            } catch (IOException e) {
                lastException = e;
                Log.w(TAG, "Metode 1 gagal: " + e.getMessage());
                disconnectInternal();
            }

            // Metode 2: Standard Insecure RFCOMM Socket (Fallback 1)
            if (!connected) {
                try {
                    Log.i(TAG, "Mencoba koneksi Metode 2 (Standard Insecure RFCOMM)...");
                    socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                    connected = true;
                    Log.i(TAG, "Koneksi Metode 2 berhasil.");
        } catch (IOException e) {
                    lastException = e;
                    Log.w(TAG, "Metode 2 gagal: " + e.getMessage());
                    disconnectInternal();
                }
            }

            // Metode 3: Reflection Fallback (Metode 2)
            if (!connected) {
                try {
                    Log.i(TAG, "Mencoba koneksi Metode 3 (Reflection RFCOMM)...");
                    socket = (BluetoothSocket) device.getClass().getMethod("createRfcommSocket", new Class[]{int.class}).invoke(device, 1);
                    socket.connect();
                    connected = true;
                    Log.i(TAG, "Koneksi Metode 3 berhasil.");
                } catch (Exception e) {
                    Log.w(TAG, "Metode 3 gagal: " + e.getMessage());
                    disconnectInternal();
                    if (e instanceof IOException) {
                        lastException = (IOException) e;
                    } else {
                        lastException = new IOException(e.getMessage(), e);
                    }
                }
            }

            if (!connected) {
                throw lastException != null ? lastException : new IOException("Semua metode koneksi Bluetooth gagal.");
            }

            outputStream = socket.getOutputStream();
            connectedDeviceName = device.getName();
            connectedDeviceAddress = device.getAddress();

            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("deviceName", device.getName());
            ret.put("address", device.getAddress());
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
        if (!ensureBluetoothPermissions(call, false)) {
            return;
        }
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
        if (!ensureBluetoothPermissions(call, false)) {
            return;
        }
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
        } catch (IOException | JSONException e) {
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
        ret.put("address", connectedDeviceAddress != null ? connectedDeviceAddress : "");
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        stopDiscoveryInternal();
        disconnectInternal();
        super.handleOnDestroy();
    }

    private void addDiscoveredDevice(BluetoothDevice device) {
        String address = device.getAddress();
        for (JSObject existing : discoveredDevices) {
            if (address.equals(existing.getString("address"))) {
                return;
            }
        }
        JSObject obj = new JSObject();
        obj.put("name", device.getName() != null ? device.getName() : "Tanpa Nama");
        obj.put("address", address);
        obj.put("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
        discoveredDevices.add(obj);
        Log.d(TAG, "Ditemukan: " + device.getName() + " (" + address + ")");
    }

    private void unregisterDiscoveryReceiver() {
        if (discoveryReceiver != null) {
            try {
                getActivity().unregisterReceiver(discoveryReceiver);
            } catch (Exception ignored) {
            }
            discoveryReceiver = null;
        }
    }

    private void stopDiscoveryInternal() {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter != null) {
                adapter.cancelDiscovery();
            }
        } catch (Exception ignored) {
        }
        unregisterDiscoveryReceiver();
        isDiscovering = false;
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
        connectedDeviceAddress = null;
    }

    private boolean ensureBluetoothPermissions(PluginCall call, boolean forDiscovery) {
        if (hasBluetoothPermissions(forDiscovery)) {
            return true;
        }
        requestPermissionForAliases(getRequiredPermissionAliases(forDiscovery), call, "bluetoothPermissionCallback");
        return false;
    }

    private boolean hasBluetoothPermissions(boolean forDiscovery) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            boolean connectGranted = getPermissionState("btConnect") == PermissionState.GRANTED;
            boolean scanGranted = !forDiscovery || getPermissionState("btScan") == PermissionState.GRANTED;
            boolean locationGranted = !forDiscovery || getPermissionState("location") == PermissionState.GRANTED;
            return connectGranted && scanGranted && locationGranted;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return !forDiscovery || getPermissionState("location") == PermissionState.GRANTED;
        }
        return true;
    }

    private String[] getRequiredPermissionAliases(boolean forDiscovery) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return forDiscovery ? new String[]{ "btConnect", "btScan", "location" } : new String[]{ "btConnect" };
        }
        return forDiscovery ? new String[]{ "location" } : new String[]{};
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        if (call == null) {
            return;
        }

        String method = call.getMethodName();
        boolean forDiscovery = "startDiscovery".equals(method) || "stopDiscovery".equals(method);
        if (!hasBluetoothPermissions(forDiscovery)) {
            call.reject("Izin Bluetooth belum diberikan. Aktifkan izin Nearby devices/Bluetooth dari pengaturan aplikasi.");
            return;
        }

        if ("getPairedDevices".equals(method)) {
            getPairedDevices(call);
        } else if ("startDiscovery".equals(method)) {
            startDiscovery(call);
        } else if ("stopDiscovery".equals(method)) {
            stopDiscovery(call);
        } else if ("connect".equals(method)) {
            connect(call);
        } else if ("print".equals(method)) {
            print(call);
        } else if ("printRaw".equals(method)) {
            printRaw(call);
        } else if ("getStatus".equals(method)) {
            getStatus(call);
        } else {
            call.reject("Aksi Bluetooth tidak dikenal.");
        }
    }
}

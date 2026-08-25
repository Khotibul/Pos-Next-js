package com.posqu.mobile.lite

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "posqu/permissions"
    private val permissionRequestCode = 4711

    private val neededPermissions: Array<String>
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ : izin Bluetooth runtime baru
            arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
            )
        } else {
            // Android 11 ke bawah : lokasi dibutuhkan untuk scan BT
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
            )
        }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "requestPrinterPermissions" -> {
                        val allGranted = neededPermissions.all {
                            ContextCompat.checkSelfPermission(this, it) ==
                                PackageManager.PERMISSION_GRANTED
                        }
                        if (allGranted) {
                            result.success(true)
                        } else {
                            ActivityCompat.requestPermissions(
                                this,
                                neededPermissions,
                                permissionRequestCode,
                            )
                            // Hasil aktual dikirim lewat onRequestPermissionsResult
                            // -> disimpan dan Flutter mem-polling via hasPrinterPermissions
                            result.success(false)
                        }
                    }
                    "hasPrinterPermissions" -> {
                        val allGranted = neededPermissions.all {
                            ContextCompat.checkSelfPermission(this, it) ==
                                PackageManager.PERMISSION_GRANTED
                        }
                        result.success(allGranted)
                    }
                    else -> result.notImplemented()
                }
            }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == permissionRequestCode) {
            val granted = grantResults.isNotEmpty() &&
                grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            // Beri tahu Flutter lewat EventChannel-style: cukup kirim ulang via
            // channel yang sama memakai invokeMethod dari sisi native tidak
            // tersedia di sini; Flutter mem-polling hasPrinterPermissions.
            granted.let { }
        }
    }
}

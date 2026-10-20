package com.posqu.mobile.lite

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val channelName = "posqu/permissions"
    private val shareChannelName = "posqu/share"
    private val btChannelName = "posqu/bt"
    private val btDiscoveryChannelName = "posqu/btDiscovery"
    private val permissionRequestCode = 4711
    private val discoveryPermissionRequestCode = 4712
    private var pendingPermissionResult: MethodChannel.Result? = null
    private var pendingDiscoveryPermissionResult: MethodChannel.Result? = null

    private var discoverySink: EventChannel.EventSink? = null
    private var discoveryReceiver: BroadcastReceiver? = null

    private val bluetoothAdapter: BluetoothAdapter?
        get() = (getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    private val neededPermissions: Array<String>
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
            )
        } else {
            emptyArray()
        }

    private fun permissionsGranted(): Boolean = neededPermissions.all {
        ContextCompat.checkSelfPermission(this, it) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun discoveryPermissionGranted(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ||
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "requestPrinterPermissions" -> {
                        if (permissionsGranted()) {
                            result.success(true)
                        } else if (pendingPermissionResult != null) {
                            result.success("pending")
                        } else if (neededPermissions.isEmpty()) {
                            result.success(true)
                        } else {
                            pendingPermissionResult = result
                            ActivityCompat.requestPermissions(
                                this,
                                neededPermissions,
                                permissionRequestCode,
                            )
                        }
                    }
                    "hasPrinterPermissions" -> {
                        result.success(permissionsGranted())
                    }
                    "requestDiscoveryPermissions" -> {
                        if (discoveryPermissionGranted()) {
                            result.success(true)
                        } else if (pendingDiscoveryPermissionResult != null) {
                            result.success("pending")
                        } else {
                            pendingDiscoveryPermissionResult = result
                            ActivityCompat.requestPermissions(
                                this,
                                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                                discoveryPermissionRequestCode,
                            )
                        }
                    }
                    "hasDiscoveryPermissions" -> {
                        result.success(discoveryPermissionGranted())
                    }
                    "openPrinterPermissionSettings" -> {
                        try {
                            startActivity(
                                Intent(
                                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                    Uri.fromParts("package", packageName, null),
                                ),
                            )
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    }
                    else -> result.notImplemented()
                }
            }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, shareChannelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "shareToWhatsApp" -> shareToWhatsApp(call, result)
                    "isWhatsAppInstalled" -> {
                        val packages = listOf("com.whatsapp", "com.whatsapp.w4b")
                        val installed = packages.any { pkg ->
                            try {
                                packageManager.getPackageInfo(pkg, 0)
                                true
                            } catch (e: Exception) {
                                false
                            }
                        }
                        result.success(installed)
                    }
                    else -> result.notImplemented()
                }
            }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, btChannelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getBondedDevices" -> getBondedDevices(result)
                    "startDiscovery" -> startDiscovery(result)
                    "cancelDiscovery" -> {
                        cancelDiscovery()
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }

        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            btDiscoveryChannelName,
        ).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(
                    arguments: Any?,
                    events: EventChannel.EventSink?,
                ) {
                    discoverySink = events
                }

                override fun onCancel(arguments: Any?) {
                    cancelDiscovery()
                    discoverySink = null
                }
            },
        )
    }

    private fun getBondedDevices(result: MethodChannel.Result) {
        val adapter = bluetoothAdapter
        if (adapter == null) {
            result.error("unavailable", "Bluetooth tidak tersedia di perangkat ini", null)
            return
        }
        try {
            val list = adapter.bondedDevices.map { device ->
                hashMapOf(
                    "address" to device.address,
                    "name" to (device.name ?: device.address),
                    "isBonded" to true,
                )
            }
            result.success(list)
        } catch (e: SecurityException) {
            result.error(
                "security",
                "Izin Bluetooth belum diberikan untuk membaca perangkat",
                null,
            )
        }
    }

    @Suppress("DEPRECATION")
    private fun startDiscovery(result: MethodChannel.Result) {
        val adapter = bluetoothAdapter
        if (adapter == null) {
            result.error("unavailable", "Bluetooth tidak tersedia di perangkat ini", null)
            return
        }
        cancelDiscovery()

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        val device: BluetoothDevice? =
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                intent.getParcelableExtra(
                                    BluetoothDevice.EXTRA_DEVICE,
                                    BluetoothDevice::class.java,
                                )
                            } else {
                                intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                            }
                        val address = device?.address ?: return
                        val name = try {
                            device.name ?: address
                        } catch (e: SecurityException) {
                            address
                        }
                        val isBonded =
                            device.bondState == BluetoothDevice.BOND_BONDED
                        discoverySink?.success(
                            hashMapOf(
                                "event" to "found",
                                "address" to address,
                                "name" to name,
                                "isBonded" to isBonded,
                            ),
                        )
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        discoverySink?.success(hashMapOf("event" to "finished"))
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }
        ContextCompat.registerReceiver(
            this,
            receiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        discoveryReceiver = receiver

        try {
            adapter.startDiscovery()
            result.success(true)
        } catch (e: SecurityException) {
            try {
                unregisterReceiver(receiver)
            } catch (ignored: Exception) {
            }
            discoveryReceiver = null
            result.error(
                "security",
                "Izin belum diberikan untuk memindai perangkat Bluetooth",
                null,
            )
        }
    }

    private fun cancelDiscovery() {
        discoveryReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (ignored: Exception) {
            }
        }
        discoveryReceiver = null
        try {
            bluetoothAdapter?.cancelDiscovery()
        } catch (ignored: SecurityException) {
        }
    }

    private fun shareToWhatsApp(call: MethodCall, result: MethodChannel.Result) {
        val text = call.argument<String>("text")
        val path = call.argument<String>("path")
        val packages = listOf("com.whatsapp", "com.whatsapp.w4b")

        for (pkg in packages) {
            try {
                val intent = Intent(Intent.ACTION_SEND).apply { setPackage(pkg) }
                if (path != null) {
                    val file = File(path)
                    if (!file.exists()) {
                        result.success(false)
                        return
                    }
                    val uri = FileProvider.getUriForFile(
                        this,
                        "$packageName.posqufile",
                        file,
                    )
                    intent.type = contentResolver.getType(uri) ?: "*/*"
                    intent.putExtra(Intent.EXTRA_STREAM, uri)
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } else {
                    intent.type = "text/plain"
                }
                if (!text.isNullOrEmpty()) {
                    intent.putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(intent)
                result.success(true)
                return
            } catch (e: ActivityNotFoundException) {
                continue
            } catch (e: Exception) {
                continue
            }
        }
        result.success(false)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.isNotEmpty() &&
            grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        when (requestCode) {
            permissionRequestCode -> {
                pendingPermissionResult?.success(granted)
                pendingPermissionResult = null
            }
            discoveryPermissionRequestCode -> {
                pendingDiscoveryPermissionResult?.success(granted)
                pendingDiscoveryPermissionResult = null
            }
        }
    }

    override fun onDestroy() {
        cancelDiscovery()
        discoverySink = null
        super.onDestroy()
    }
}

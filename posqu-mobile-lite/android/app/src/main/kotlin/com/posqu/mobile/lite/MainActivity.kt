package com.posqu.mobile.lite

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val channelName = "posqu/permissions"
    private val shareChannelName = "posqu/share"
    private val permissionRequestCode = 4711
    private var pendingPermissionResult: MethodChannel.Result? = null

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
        if (requestCode == permissionRequestCode) {
            val granted = grantResults.isNotEmpty() &&
                grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }
}

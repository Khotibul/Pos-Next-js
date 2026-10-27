using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using PosquDesktop.Models;

namespace PosquDesktop.Services;

public sealed class ApiException : Exception
{
    public int? StatusCode { get; }
    public string? Code { get; }

    public ApiException(string message, int? statusCode = null, string? code = null)
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }
}

public sealed class ApiClient : IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
    };

    private readonly HttpClient _http;
    private string _baseUrl;
    private OfflineStore? _offline;

    public string BaseUrl => _baseUrl;
    public string? Token { get; set; }
    public bool IsOffline { get; private set; }
    public OfflineStore? Offline => _offline;
    public int PendingOperations => _offline?.PendingCount ?? 0;

    public event Action? ConnectivityChanged;

    public ApiClient(string baseUrl)
    {
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(45) };
        _http.DefaultRequestHeaders.Add("Accept", "application/json");
        _baseUrl = NormalizeBaseUrl(baseUrl);
    }

    public void UseOfflineStore(OfflineStore store) => _offline = store;

    private void SetOffline()
    {
        if (IsOffline) return;
        IsOffline = true;
        ConnectivityChanged?.Invoke();
    }

    private void SetOnline()
    {
        if (!IsOffline) return;
        IsOffline = false;
        ConnectivityChanged?.Invoke();
    }

    public void SetBaseUrl(string baseUrl)
    {
        _baseUrl = NormalizeBaseUrl(baseUrl);
    }

    public static string NormalizeBaseUrl(string baseUrl)
    {
        var value = (baseUrl ?? "").Trim();
        if (string.IsNullOrWhiteSpace(value)) value = AppSettings.DefaultApiBaseUrl;
        if (!value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            value = "https://" + value;
        }
        value = value.TrimEnd('/');
        if (Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            if (string.IsNullOrEmpty(uri.AbsolutePath) || uri.AbsolutePath == "/")
                value += "/api";
        }
        return value;
    }

    private Uri BuildUri(string path, IEnumerable<KeyValuePair<string, string?>>? query = null)
    {
        var url = _baseUrl + "/" + path.TrimStart('/');
        if (query != null)
        {
            var parts = query
                .Where(q => q.Value != null)
                .Select(q => $"{Uri.EscapeDataString(q.Key)}={Uri.EscapeDataString(q.Value!)}")
                .ToList();
            if (parts.Count > 0) url += "?" + string.Join("&", parts);
        }
        return new Uri(url);
    }

    private async Task<JsonElement> SendAsync(
        HttpMethod method,
        string path,
        object? body = null,
        IEnumerable<KeyValuePair<string, string?>>? query = null,
        bool auth = true,
        string? cacheKey = null,
        string? entity = null,
        CancellationToken ct = default)
    {
        var payloadJson = body == null ? null : JsonSerializer.Serialize(body);
        using var request = new HttpRequestMessage(method, BuildUri(path, query));
        if (auth && !string.IsNullOrWhiteSpace(Token))
            request.Headers.TryAddWithoutValidation("Authorization", "Bearer " + Token);
        if (payloadJson != null)
            request.Content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        string content;
        try
        {
            response = await _http.SendAsync(request, ct);
            content = await response.Content.ReadAsStringAsync(ct);
        }
        catch (TaskCanceledException)
        {
            return OfflineFallback(method, path, payloadJson, cacheKey, entity,
                "Koneksi ke server terlalu lama.");
        }
        catch (HttpRequestException ex)
        {
            return OfflineFallback(method, path, payloadJson, cacheKey, entity,
                "Tidak dapat terhubung ke server. " + ex.Message);
        }

        JsonDocument? doc = null;
        JsonElement root = default;
        if (!string.IsNullOrWhiteSpace(content))
        {
            try
            {
                doc = JsonDocument.Parse(content);
                root = doc.RootElement;
            }
            catch
            {
                if (!response.IsSuccessStatusCode)
                    throw new ApiException($"Server mengembalikan respons tidak valid (HTTP {(int)response.StatusCode}).", (int)response.StatusCode);
            }
        }

        using (doc)
        {
            if (!response.IsSuccessStatusCode)
            {
                var message = TryGetString(root, "message") ?? TryGetString(root, "error");
                var code = TryGetString(root, "code");
                if (string.IsNullOrWhiteSpace(message))
                    message = $"Permintaan gagal (HTTP {(int)response.StatusCode}).";
                throw new ApiException(message, (int)response.StatusCode, code);
            }

            if (doc != null && root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("ok", out var ok) && ok.ValueKind == JsonValueKind.False)
            {
                var message = TryGetString(root, "message") ?? "Permintaan ditolak server.";
                var code = TryGetString(root, "code");
                throw new ApiException(message, (int)response.StatusCode, code);
            }

            JsonElement result;
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("data", out var data))
                result = data.Clone();
            else
                result = doc == null ? default : root.Clone();

            SetOnline();
            if (cacheKey != null && result.ValueKind != JsonValueKind.Undefined)
                _offline?.Write("cache_" + cacheKey, result.GetRawText());
            return result;
        }
    }

    private JsonElement OfflineFallback(
        HttpMethod method, string path, string? payloadJson, string? cacheKey, string? entity, string error)
    {
        SetOffline();

        if (method == HttpMethod.Get && cacheKey != null && _offline != null)
        {
            var raw = _offline.Read<string>("cache_" + cacheKey);
            if (!string.IsNullOrWhiteSpace(raw))
            {
                try
                {
                    using var doc = JsonDocument.Parse(raw);
                    return doc.RootElement.Clone();
                }
                catch
                {
                    // cache rusak; lanjut ke error koneksi
                }
            }
        }

        if (method != HttpMethod.Get && _offline != null && !string.IsNullOrWhiteSpace(Token))
        {
            _offline.Enqueue(new OfflineOperation
            {
                Method = method.Method,
                Path = path,
                PayloadJson = payloadJson,
                Entity = entity ?? path
            });
            return default;
        }

        throw new ApiException(error + " Data offline belum tersedia untuk halaman ini.");
    }

    public async Task<bool> SendQueuedOperationAsync(OfflineOperation operation, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(new HttpMethod(operation.Method), BuildUri(operation.Path));
        if (!string.IsNullOrWhiteSpace(Token))
            request.Headers.TryAddWithoutValidation("Authorization", "Bearer " + Token);
        if (!string.IsNullOrWhiteSpace(operation.PayloadJson))
            request.Content = new StringContent(operation.PayloadJson, Encoding.UTF8, "application/json");

        try
        {
            var response = await _http.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);
            if (response.IsSuccessStatusCode)
            {
                SetOnline();
                return true;
            }

            if ((int)response.StatusCode >= 500 || response.StatusCode == HttpStatusCode.RequestTimeout)
                throw new ApiException($"Server sibuk (HTTP {(int)response.StatusCode}).", (int)response.StatusCode);

            var message = "Permintaan ditolak server.";
            try
            {
                using var doc = JsonDocument.Parse(content);
                message = TryGetString(doc.RootElement, "message") ?? message;
            }
            catch
            {
                // abaikan body tidak valid
            }
            throw new ApiException(message, (int)response.StatusCode);
        }
        catch (TaskCanceledException)
        {
            throw new ApiException("Koneksi ke server terlalu lama.");
        }
        catch (HttpRequestException ex)
        {
            throw new ApiException("Tidak dapat terhubung ke server. " + ex.Message);
        }
    }

    private static string? TryGetString(JsonElement root, string name)
    {
        if (root.ValueKind == JsonValueKind.Object &&
            root.TryGetProperty(name, out var value) &&
            value.ValueKind == JsonValueKind.String)
        {
            return value.GetString();
        }
        return null;
    }

    private static T? Deserialize<T>(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Undefined || element.ValueKind == JsonValueKind.Null)
            return default;
        return element.Deserialize<T>(JsonOptions);
    }

    // ---------------- Auth ----------------

    public async Task<(StoredSession Session, TenantResponse? Tenant)> LoginAsync(
        string email, string password, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BuildUri("mobile/auth/login"))
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { email, password }), Encoding.UTF8, "application/json")
        };
        // Login lama tidak membawa token; pastikan header Authorization tidak terkirim.
        string content;
        HttpStatusCode status;
        try
        {
            var response = await _http.SendAsync(request, ct);
            status = response.StatusCode;
            content = await response.Content.ReadAsStringAsync(ct);
        }
        catch (TaskCanceledException)
        {
            throw new ApiException("Koneksi ke server terlalu lama. Periksa internet lalu coba lagi.");
        }
        catch (HttpRequestException ex)
        {
            throw new ApiException("Tidak dapat terhubung ke server. Periksa koneksi internet. " + ex.Message);
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(content);
        }
        catch
        {
            throw new ApiException($"Respons login tidak valid (HTTP {(int)status}).", (int)status);
        }

        using (doc)
        {
            var root = doc.RootElement;
            if ((int)status >= 400)
            {
                throw new ApiException(
                    TryGetString(root, "message") ?? $"Login gagal (HTTP {(int)status}).",
                    (int)status,
                    TryGetString(root, "code"));
            }

            if (root.ValueKind != JsonValueKind.Object ||
                !root.TryGetProperty("ok", out var ok) || ok.ValueKind != JsonValueKind.True)
            {
                throw new ApiException(
                    TryGetString(root, "message") ?? "Login gagal. Periksa email dan password.",
                    (int)status,
                    TryGetString(root, "code"));
            }

            if (!root.TryGetProperty("token", out var tokenEl) || tokenEl.ValueKind != JsonValueKind.String ||
                !root.TryGetProperty("user", out var userEl) || userEl.ValueKind != JsonValueKind.Object)
            {
                throw new ApiException("Respons login dari server tidak lengkap.", (int)status);
            }

            var user = userEl.Deserialize<UserInfo>(JsonOptions)
                       ?? throw new ApiException("Data pengguna tidak valid.", (int)status);
            var token = tokenEl.GetString() ?? "";
            if (string.IsNullOrWhiteSpace(token))
                throw new ApiException("Token login tidak diterima dari server.", (int)status);

            Token = token;
            var session = new StoredSession { Token = token, User = user, SavedAt = DateTime.Now };
            TenantResponse? tenant = null;
            try
            {
                tenant = await GetTenantAsync(ct);
                if (tenant?.Tenant != null)
                {
                    user.TenantId ??= tenant.Tenant.Id;
                    user.TenantName ??= tenant.Tenant.Name;
                    session.User = user;
                }
            }
            catch
            {
                // Tenant opsional; login tetap dianggap sukses.
            }

            return (session, tenant);
        }
    }

    public async Task<TenantResponse?> GetTenantAsync(CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/tenant", cacheKey: "tenant", ct: ct);
        return Deserialize<TenantResponse>(data);
    }

    // ---------------- Products ----------------

    public async Task<List<Product>> GetProductsAsync(
        string? search = null, int page = 1, int limit = 500, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/products", query: new Dictionary<string, string?>
        {
            ["search"] = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            ["page"] = page.ToString(),
            ["limit"] = limit.ToString()
        }, cacheKey: page == 1 && string.IsNullOrWhiteSpace(search) ? "products" : null,
            entity: "product", ct: ct);
        return Deserialize<List<Product>>(data) ?? new List<Product>();
    }

    public async Task<List<Product>> GetAllProductsAsync(
        IProgress<string>? progress = null, CancellationToken ct = default)
    {
        const int pageSize = 500;
        var all = new List<Product>();
        try
        {
        for (var page = 1; page <= 40; page++)
        {
            ct.ThrowIfCancellationRequested();
            var batch = await GetProductsAsync(null, page, pageSize, ct);
            all.AddRange(batch);
            progress?.Report($"Memuat produk halaman {page} ({all.Count} produk)…");
            if (batch.Count < pageSize) break;
        }
        _offline?.Write("products_all", all);
        if (all.Count > 0) _offline?.Write("cache_products", all);
        return all;
        }
        catch (ApiException)
        {
            var cached = _offline?.Read<List<Product>>("products_all");
            if (cached is { Count: > 0 }) return cached;
            throw;
        }
    }

    public async Task CreateProductAsync(Product p, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/products", BuildProductPayload(p), entity: "product", ct: ct);
    }

    public async Task UpdateProductAsync(Product p, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Put, $"mobile/products/{Uri.EscapeDataString(p.Id)}", BuildProductPayload(p, includeId: false), entity: "product", ct: ct);
    }

    public async Task DeleteProductAsync(string id, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Delete, $"mobile/products/{Uri.EscapeDataString(id)}", entity: "product", ct: ct);
    }

    private static object BuildProductPayload(Product p, bool includeId = true)
    {
        var dict = new Dictionary<string, object?>
        {
            ["sku"] = p.Sku,
            ["slug"] = null,
            ["name"] = p.Name,
            ["description"] = string.IsNullOrWhiteSpace(p.Description) ? null : p.Description,
            ["barcode"] = string.IsNullOrWhiteSpace(p.Barcode) ? null : p.Barcode,
            ["qrCode"] = string.IsNullOrWhiteSpace(p.QrCode) ? null : p.QrCode,
            ["categoryId"] = string.IsNullOrWhiteSpace(p.CategoryId) ? null : p.CategoryId,
            ["brandId"] = string.IsNullOrWhiteSpace(p.BrandId) ? null : p.BrandId,
            ["supplierId"] = string.IsNullOrWhiteSpace(p.SupplierId) ? null : p.SupplierId,
            ["unitId"] = string.IsNullOrWhiteSpace(p.UnitId) ? null : p.UnitId,
            ["costPrice"] = p.CostPrice,
            ["sellingPrice"] = p.SellingPrice,
            ["marginPct"] = p.MarginPct,
            ["taxRate"] = p.TaxRate,
            ["weight"] = p.Weight,
            ["volume"] = p.Volume,
            ["minStock"] = p.MinStock,
            ["reorderPoint"] = p.ReorderPoint,
            ["wholesalePrice"] = p.WholesalePrice,
            ["wholesaleDiscountPercent"] = p.WholesaleDiscountPercent,
            ["wholesaleMinQty"] = (int)p.WholesaleMinQty,
            ["isActive"] = p.IsActive,
            ["isFeatured"] = p.IsFeatured,
            ["isConsignment"] = p.IsConsignment,
            ["type"] = string.IsNullOrWhiteSpace(p.Type) ? "SINGLE" : p.Type
        };
        if (includeId) dict["id"] = p.Id;
        return dict;
    }

    public async Task<List<ProductCategory>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/categories", cacheKey: "categories", ct: ct);
        return Deserialize<List<ProductCategory>>(data) ?? new List<ProductCategory>();
    }

    public async Task SaveCategoryAsync(ProductCategory c, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/categories", entity: "category", body: new
        {
            id = c.Id,
            name = c.Name,
            description = string.IsNullOrWhiteSpace(c.Description) ? null : c.Description,
            icon = (string?)null,
            color = (string?)null,
            isActive = c.IsActive,
            productCount = c.ProductCount
        }, ct: ct);
    }

    public async Task DeleteCategoryAsync(string id, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Delete, $"mobile/categories/{Uri.EscapeDataString(id)}", entity: "category", ct: ct);
    }

    public async Task<List<ProductUnit>> GetUnitsAsync(CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/units", cacheKey: "units", ct: ct);
        return Deserialize<List<ProductUnit>>(data) ?? new List<ProductUnit>();
    }

    public async Task SaveUnitAsync(ProductUnit u, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/units", new { id = u.Id, name = u.Name }, entity: "unit", ct: ct);
    }

    // ---------------- Partners ----------------

    public async Task<List<Customer>> GetCustomersAsync(string? search = null, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/customers", query: new Dictionary<string, string?>
        {
            ["search"] = string.IsNullOrWhiteSpace(search) ? null : search.Trim()
        }, cacheKey: string.IsNullOrWhiteSpace(search) ? "customers" : null, entity: "customer", ct: ct);
        return Deserialize<List<Customer>>(data) ?? new List<Customer>();
    }

    public async Task SaveCustomerAsync(Customer c, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/customers", entity: "customer", body: new
        {
            id = c.Id,
            name = c.Name,
            email = string.IsNullOrWhiteSpace(c.Email) ? null : c.Email,
            phone = string.IsNullOrWhiteSpace(c.Phone) ? null : c.Phone,
            address = string.IsNullOrWhiteSpace(c.Address) ? null : c.Address,
            city = string.IsNullOrWhiteSpace(c.City) ? null : c.City,
            totalPurchase = c.TotalPurchase,
            purchaseCount = c.PurchaseCount,
            points = c.Points,
            isWholesale = c.IsWholesale,
            customerType = c.CustomerType,
            isActive = c.IsActive
        }, ct: ct);
    }

    public async Task DeleteCustomerAsync(string id, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Delete, $"mobile/customers/{Uri.EscapeDataString(id)}", entity: "customer", ct: ct);
    }

    public async Task<List<Supplier>> GetSuppliersAsync(string? search = null, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/suppliers", query: new Dictionary<string, string?>
        {
            ["search"] = string.IsNullOrWhiteSpace(search) ? null : search.Trim()
        }, cacheKey: string.IsNullOrWhiteSpace(search) ? "suppliers" : null, entity: "supplier", ct: ct);
        return Deserialize<List<Supplier>>(data) ?? new List<Supplier>();
    }

    public async Task SaveSupplierAsync(Supplier s, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/suppliers", entity: "supplier", body: new
        {
            id = s.Id,
            name = s.Name,
            email = string.IsNullOrWhiteSpace(s.Email) ? null : s.Email,
            phone = string.IsNullOrWhiteSpace(s.Phone) ? null : s.Phone,
            address = string.IsNullOrWhiteSpace(s.Address) ? null : s.Address,
            city = string.IsNullOrWhiteSpace(s.City) ? null : s.City,
            contactPerson = string.IsNullOrWhiteSpace(s.ContactPerson) ? null : s.ContactPerson,
            npwp = string.IsNullOrWhiteSpace(s.Npwp) ? null : s.Npwp,
            isActive = s.IsActive
        }, ct: ct);
    }

    public async Task DeleteSupplierAsync(string id, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Delete, $"mobile/suppliers/{Uri.EscapeDataString(id)}", entity: "supplier", ct: ct);
    }

    // ---------------- Sales ----------------

    public async Task<List<Sale>> GetSalesAsync(
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? search = null,
        int limit = 500,
        int page = 1,
        CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/sales", query: new Dictionary<string, string?>
        {
            ["search"] = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            ["start_date"] = startDate?.ToString("O"),
            ["end_date"] = endDate?.ToString("O"),
            ["page"] = page.ToString(),
            ["limit"] = limit.ToString()
        }, cacheKey: page == 1 && string.IsNullOrWhiteSpace(search) ? "sales" : null,
            entity: "sale", ct: ct);
        return Deserialize<List<Sale>>(data) ?? new List<Sale>();
    }

    public async Task<Sale?> CreateSaleAsync(object payload, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Post, "mobile/sales", payload, entity: "sale", ct: ct);
        var sale = Deserialize<Sale>(data);
        if (sale != null || !IsOffline) return sale;

        try
        {
            sale = Deserialize<Sale>(JsonSerializer.SerializeToElement(payload));
        }
        catch
        {
            return null;
        }
        if (sale == null) return null;

        if (sale.CreatedAt == default) sale.CreatedAt = DateTime.Now;
        if (sale.UpdatedAt == default) sale.UpdatedAt = sale.CreatedAt;

        var cachedSales = _offline?.Read<List<Sale>>("cache_sales") ?? new List<Sale>();
        cachedSales.RemoveAll(s => s.Id == sale.Id || s.InvoiceNo == sale.InvoiceNo);
        cachedSales.Insert(0, sale);
        _offline?.Write("cache_sales", cachedSales);

        ApplyOfflineStock(sale);
        return sale;
    }

    private void ApplyOfflineStock(Sale sale)
    {
        if (_offline == null) return;
        var products = _offline.Read<List<Product>>("products_all");
        if (products is not { Count: > 0 })
            products = _offline.Read<List<Product>>("cache_products");
        if (products is not { Count: > 0 }) return;

        foreach (var item in sale.Items)
        {
            var product = products.FirstOrDefault(p => p.Id == item.ProductId);
            if (product != null) product.Stock -= item.Qty;
        }

        _offline.Write("products_all", products);
        _offline.Write("cache_products", products);
    }

    public async Task DeleteSaleAsync(string id, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Delete, $"mobile/sales/{Uri.EscapeDataString(id)}", entity: "sale", ct: ct);
    }

    // ---------------- Purchases ----------------

    public async Task<List<PurchaseOrder>> GetPurchaseOrdersAsync(int limit = 200, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/purchases", query: new Dictionary<string, string?>
        {
            ["limit"] = limit.ToString()
        }, cacheKey: "purchases", entity: "purchase", ct: ct);
        return Deserialize<List<PurchaseOrder>>(data) ?? new List<PurchaseOrder>();
    }

    public async Task SavePurchaseOrderAsync(PurchaseOrder order, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/purchases", entity: "purchase", body: new
        {
            id = string.IsNullOrWhiteSpace(order.Id) ? Guid.NewGuid().ToString() : order.Id,
            orderNo = order.OrderNo,
            supplierId = string.IsNullOrWhiteSpace(order.SupplierId) ? null : order.SupplierId,
            status = string.IsNullOrWhiteSpace(order.Status) ? "DRAFT" : order.Status.ToUpperInvariant(),
            subtotal = order.Subtotal,
            tax = order.Tax,
            total = order.Total,
            notes = string.IsNullOrWhiteSpace(order.Notes) ? null : order.Notes,
            createdAt = order.CreatedAt == default ? null : order.CreatedAt.ToString("O"),
            items = order.Items.Select(i => new
            {
                productId = i.ProductId,
                qty = i.Qty,
                price = i.CostPrice
            }).ToArray()
        }, ct: ct);
    }
    // ---------------- Shifts & Cash ----------------

    public async Task<List<CashierShift>> GetShiftsAsync(
        string? status = null, string? cashierId = null, int limit = 100, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/cashier-shifts", query: new Dictionary<string, string?>
        {
            ["status"] = string.IsNullOrWhiteSpace(status) ? null : status,
            ["cashierId"] = string.IsNullOrWhiteSpace(cashierId) ? null : cashierId,
            ["limit"] = limit.ToString()
        }, cacheKey: string.IsNullOrWhiteSpace(status) && string.IsNullOrWhiteSpace(cashierId) ? "shifts" : null,
            entity: "shift", ct: ct);
        return Deserialize<List<CashierShift>>(data) ?? new List<CashierShift>();
    }

    public async Task OpenShiftAsync(object payload, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/cashier-shifts", payload, entity: "shift", ct: ct);
    }

    public async Task CloseShiftAsync(string id, object payload, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, $"mobile/cashier-shifts/{Uri.EscapeDataString(id)}/close", payload, entity: "shift-close", ct: ct);
    }

    public async Task<List<CashTransaction>> GetCashTransactionsAsync(
        int limit = 200, DateTime? startDate = null, DateTime? endDate = null, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/cash-transactions", query: new Dictionary<string, string?>
        {
            ["limit"] = limit.ToString(),
            ["startDate"] = startDate?.ToString("O"),
            ["endDate"] = endDate?.ToString("O")
        }, cacheKey: startDate == null && endDate == null ? "cash" : null, entity: "cash", ct: ct);
        return Deserialize<List<CashTransaction>>(data) ?? new List<CashTransaction>();
    }

    public async Task CreateCashTransactionAsync(object payload, CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/cash-transactions", payload, entity: "cash", ct: ct);
    }

    // ---------------- Receivables & Payables ----------------

    public async Task<List<Receivable>> GetReceivablesAsync(string? status = null, string? search = null, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/receivables", query: new Dictionary<string, string?>
        {
            ["status"] = string.IsNullOrWhiteSpace(status) ? null : status,
            ["search"] = string.IsNullOrWhiteSpace(search) ? null : search
        }, cacheKey: string.IsNullOrWhiteSpace(search) && string.IsNullOrWhiteSpace(status) ? "receivables" : null, entity: "receivable", ct: ct);
        return Deserialize<List<Receivable>>(data) ?? new List<Receivable>();
    }

    public async Task<List<Payable>> GetPayablesAsync(string? status = null, string? search = null, CancellationToken ct = default)
    {
        var data = await SendAsync(HttpMethod.Get, "mobile/payables", query: new Dictionary<string, string?>
        {
            ["status"] = string.IsNullOrWhiteSpace(status) ? null : status,
            ["search"] = string.IsNullOrWhiteSpace(search) ? null : search
        }, cacheKey: string.IsNullOrWhiteSpace(search) && string.IsNullOrWhiteSpace(status) ? "payables" : null, entity: "payable", ct: ct);
        return Deserialize<List<Payable>>(data) ?? new List<Payable>();
    }

    public async Task RecordReceivablePaymentAsync(
        string receivableId, decimal amount, string method, string? reference, string? notes,
        CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/receivable-payments", entity: "receivable-payment", body: new
        {
            id = Guid.NewGuid().ToString(),
            receivableId,
            amount,
            method,
            reference = string.IsNullOrWhiteSpace(reference) ? null : reference,
            notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
            paidAt = DateTime.UtcNow.ToString("O")
        }, ct: ct);
    }

    public async Task RecordPayablePaymentAsync(
        string payableId, decimal amount, string method, string? reference, string? notes,
        CancellationToken ct = default)
    {
        await SendAsync(HttpMethod.Post, "mobile/payable-payments", entity: "payable-payment", body: new
        {
            id = Guid.NewGuid().ToString(),
            payableId,
            amount,
            method,
            reference = string.IsNullOrWhiteSpace(reference) ? null : reference,
            notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
            paidAt = DateTime.UtcNow.ToString("O")
        }, ct: ct);
    }

    public void Dispose() => _http.Dispose();
}

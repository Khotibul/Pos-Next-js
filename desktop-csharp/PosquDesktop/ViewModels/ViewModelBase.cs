using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public interface IRefreshable
{
    Task RefreshAsync();
}

public abstract partial class ViewModelBase : ObservableObject, IRefreshable
{
    [ObservableProperty]
    private bool isBusy;

    [ObservableProperty]
    private string? errorMessage;

    [ObservableProperty]
    private string? statusMessage;

    public bool HasError => !string.IsNullOrWhiteSpace(ErrorMessage);
    public bool HasStatus => !string.IsNullOrWhiteSpace(StatusMessage);

    partial void OnErrorMessageChanged(string? value) => OnPropertyChanged(nameof(HasError));
    partial void OnStatusMessageChanged(string? value) => OnPropertyChanged(nameof(HasStatus));

    public virtual Task LoadAsync() => Task.CompletedTask;

    public async Task RefreshAsync()
    {
        await RunAsync(LoadAsync);
    }

    protected async Task RunAsync(Func<Task> action, string? successMessage = null)
    {
        if (IsBusy) return;
        IsBusy = true;
        ErrorMessage = null;
        StatusMessage = null;
        try
        {
            await action();
            if (successMessage != null) StatusMessage = successMessage;
        }
        catch (ApiException ex)
        {
            if (ex.StatusCode == 401)
            {
                App.CurrentApp.HandleUnauthorized(ex.Message);
            }
            else
            {
                ErrorMessage = ex.Message;
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = "Terjadi kesalahan: " + ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    protected static bool Confirm(string message, string title = "Konfirmasi") =>
        MessageBox.Show(message, title, MessageBoxButton.YesNo, MessageBoxImage.Question)
        == MessageBoxResult.Yes;
}

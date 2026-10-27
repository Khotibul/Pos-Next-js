using CommunityToolkit.Mvvm.ComponentModel;

namespace PosquDesktop.ViewModels;

public partial class ComingSoonViewModel : ViewModelBase
{
    [ObservableProperty] private string title;
    [ObservableProperty] private string message;

    public ComingSoonViewModel(string title, string message)
    {
        this.title = title;
        this.message = message;
    }
}


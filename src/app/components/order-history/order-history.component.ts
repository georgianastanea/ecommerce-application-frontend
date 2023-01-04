import { Component, Inject, OnInit } from '@angular/core';
import { OrderHistory } from '../../common/order-history';
import { OrderHistoryService } from '../../services/order-history.service';
import { NgModule } from '@angular/core';
import { LoginStatusComponent } from '../login-status/login-status.component';
import { OktaAuthStateService, OKTA_AUTH } from '@okta/okta-angular';
import { OktaAuth } from '@okta/okta-auth-js';


@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css']
})
export class OrderHistoryComponent implements OnInit {

  orderHistoryList: OrderHistory[] = [];
  storage: Storage = sessionStorage;
  isAuthenticated: boolean = false;
  userEmail: string = '';

  constructor(private orderHistoryService: OrderHistoryService,
              private oktaAuthService: OktaAuthStateService,
                @Inject(OKTA_AUTH) private oktaAuth: OktaAuth) { }

  ngOnInit(): void {
    // this.handleOrderHistory();

    this.oktaAuthService.authState$.subscribe(
      (result) => {
        this.isAuthenticated = result.isAuthenticated!;
        this.getUserDetails();
        
      }
    );
  }

  handleOrderHistory() {
    console.log("this is the email " + this.userEmail)
    this.orderHistoryService.getOrderHistory(this.userEmail).subscribe(
      data => {
        this.orderHistoryList = data._embedded.orders;
      }
    );}

  getUserDetails() {
    if (this.isAuthenticated) {

      
      this.oktaAuth.getUser().then(
        (res) => {
          this.userEmail = res.email as string;
          this.handleOrderHistory();
        }
      );
    }
  }


}


